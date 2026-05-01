import { cpus } from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import Database from 'better-sqlite3';
import { xxh3 } from '@node-rs/xxhash';
import { chunkFile } from './chunker.js';
import { createEmbedder } from './embedder.js';
import { SqliteVecStore } from './backends/sqlite-vec.js';
import { LanceDbStore } from './backends/lancedb.js';
import { getPaths } from '../paths.js';
import { readConfig } from '../config.js';
import type { Chunk, VectorStore } from './vector-store.js';
import { join } from 'node:path';

export type IndexStats = {
	filesIndexed: number;
	chunksCreated: number;
	durationMs: number;
};

export type ProgressCallback = (filesIndexed: number, total: number) => void;

export type DiffResult = {
	toIndex: string[];
	toDelete: string[];
	unchanged: number;
};

export async function computeIndexDiff(filePaths: string[], projectId: string): Promise<DiffResult> {
	const config = await readConfig();
	const paths = getPaths(projectId);

	// LanceDB has no cheap hash lookup — fall back to full re-index
	if (config['vector-store'] === 'lancedb') {
		return { toIndex: filePaths, toDelete: [], unchanged: 0 };
	}

	const indexedHashes = readIndexedHashesSqlite(paths.indexDb);
	const filePathSet = new Set(filePaths);
	const toDelete = [...indexedHashes.keys()].filter((p) => !filePathSet.has(p));

	const toIndex: string[] = [];
	let unchanged = 0;

	await Promise.all(
		filePaths.map(async (filePath) => {
			try {
				const content = await readFile(filePath, 'utf-8');
				const hash = xxh3.xxh64(content).toString(16).padStart(16, '0');
				if (indexedHashes.get(filePath) === hash) {
					unchanged++;
				} else {
					toIndex.push(filePath);
				}
			} catch {
				toIndex.push(filePath);
			}
		}),
	);

	return { toIndex, toDelete, unchanged };
}

export async function deleteFilesFromIndex(filePaths: string[], projectId: string): Promise<void> {
	if (filePaths.length === 0) return;
	const config = await readConfig();
	const paths = getPaths(projectId);
	// Dimensions don't matter for deletion — existing schema is preserved by CREATE TABLE IF NOT EXISTS
	const store = createVectorStore(config['vector-store'], paths, 384);
	for (const filePath of filePaths) {
		await store.delete(filePath);
	}
	await store.close();
}

function readIndexedHashesSqlite(indexDbPath: string): Map<string, string> {
	if (!existsSync(indexDbPath)) return new Map();
	const db = new Database(indexDbPath, { readonly: true });
	try {
		const rows = db.prepare('SELECT DISTINCT file_path, file_hash FROM chunks').all() as { file_path: string; file_hash: string }[];
		return new Map(rows.map((r) => [r.file_path, r.file_hash]));
	} finally {
		db.close();
	}
}

type WorkerInput = {
	filePaths: string[];
	embeddingConfig: {
		'embedding.provider': string;
		'embedding.model': string;
		'embedding.ollamaUrl': string;
		'embedding.openaiKey': string;
	};
};

type WorkerMessage =
	| { type: 'progress' }
	| { type: 'result'; chunks: Chunk[]; embeddings: number[][]; dimensions: number };

type WorkerResult = {
	chunks: Chunk[];
	embeddings: number[][];
	dimensions: number;
};

export async function indexFiles(
	filePaths: string[],
	projectId: string,
	onProgress?: ProgressCallback,
	onSaving?: (chunks: number) => void,
): Promise<IndexStats> {
	const start = Date.now();
	if (filePaths.length === 0) return { filesIndexed: 0, chunksCreated: 0, durationMs: 0 };

	const config = await readConfig();
	const paths = getPaths(projectId);

	// Ensure ONNX model is downloaded once in the main thread before workers start.
	// Workers would otherwise race on existsSync() and trigger parallel downloads.
	if ((config['embedding.provider'] ?? 'onnx') === 'onnx') {
		const { ensureOnnxModels } = await import('./providers/onnx.js');
		await ensureOnnxModels();
	}

	const numWorkers = Math.max(1, (cpus().length ?? 2) - 1);
	const partitions = partition(filePaths, numWorkers);
	let completed = 0;

	const workerResults = await Promise.all(
		partitions.map((part) =>
			runWorker(
				{
					filePaths: part,
					embeddingConfig: {
						'embedding.provider': config['embedding.provider'],
						'embedding.model': config['embedding.model'],
						'embedding.ollamaUrl': config['embedding.ollamaUrl'],
						'embedding.openaiKey': config['embedding.openaiKey'],
					},
				},
				() => {
					completed++;
					onProgress?.(completed, filePaths.length);
				},
			),
		),
	);

	const allChunks: Chunk[] = [];
	const allEmbeddings: number[][] = [];
	let dimensions = 384; // fallback for empty results
	for (const result of workerResults) {
		allChunks.push(...result.chunks);
		allEmbeddings.push(...result.embeddings);
		if (result.dimensions) dimensions = result.dimensions;
	}

	onSaving?.(allChunks.length);
	const store = createVectorStore(config['vector-store'], paths, dimensions);
	await store.upsert(allChunks, allEmbeddings);
	await store.close();

	return {
		filesIndexed: filePaths.length,
		chunksCreated: allChunks.length,
		durationMs: Date.now() - start,
	};
}

function createVectorStore(
	backend: 'sqlite' | 'lancedb',
	paths: ReturnType<typeof getPaths>,
	dimensions: number,
): VectorStore {
	if (backend === 'lancedb') {
		return new LanceDbStore(join(paths.projectRoot, 'lancedb'), dimensions);
	}
	return new SqliteVecStore(paths.indexDb, dimensions);
}

function runWorker(input: WorkerInput, onFileCompleted?: () => void): Promise<WorkerResult> {
	return new Promise((resolve, reject) => {
		const workerUrl = fileURLToPath(import.meta.url);
		const execArgv = workerUrl.endsWith('.ts')
			? ['--loader', 'ts-node/esm', '--no-warnings']
			: [];
		const worker = new Worker(workerUrl, {
			workerData: input,
			execArgv,
		});
		worker.on('message', (msg: WorkerMessage) => {
			if (msg.type === 'progress') {
				onFileCompleted?.();
			} else {
				resolve(msg);
			}
		});
		worker.on('error', reject);
		worker.on('exit', (code) => {
			if (code !== 0) reject(new Error(`Worker exited with code ${code}`));
		});
	});
}

function partition<T>(arr: T[], n: number): T[][] {
	const size = Math.ceil(arr.length / n);
	const result: T[][] = [];
	for (let i = 0; i < arr.length; i += size) {
		result.push(arr.slice(i, i + size));
	}
	return result;
}

// Worker thread entry point
if (!isMainThread && parentPort) {
	const input = workerData as WorkerInput;

	(async () => {
		const chunks: Chunk[] = [];
		const embeddings: number[][] = [];
		const embedder = await createEmbedder(input.embeddingConfig as Parameters<typeof createEmbedder>[0]);

		for (const filePath of input.filePaths) {
			let fileChunks: Chunk[] = [];
			try {
				fileChunks = await chunkFile(filePath);
			} catch {
				// skip unreadable files
			}
			// Embed this file's chunks immediately so progress reflects chunk+embed together
			const fileTexts = fileChunks.map((c) => c.content);
			const fileEmbeddings = fileTexts.length > 0 ? await embedder.embed(fileTexts) : [];
			chunks.push(...fileChunks);
			embeddings.push(...fileEmbeddings);
			parentPort!.postMessage({ type: 'progress' } satisfies WorkerMessage);
		}

		parentPort!.postMessage({ type: 'result', chunks, embeddings, dimensions: embedder.dimensions } satisfies WorkerMessage);
	})().catch((err) => {
		throw err;
	});
}
