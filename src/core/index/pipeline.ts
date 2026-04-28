import { cpus } from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
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

type WorkerInput = {
	filePaths: string[];
	embeddingConfig: {
		'embedding.provider': string;
		'embedding.model': string;
		'embedding.ollamaUrl': string;
		'embedding.openaiKey': string;
	};
};

type WorkerResult = {
	chunks: Chunk[];
	embeddings: number[][];
};

export async function indexFiles(filePaths: string[], projectId: string): Promise<IndexStats> {
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

	const workerResults = await Promise.all(
		partitions.map((part) =>
			runWorker({
				filePaths: part,
				embeddingConfig: {
					'embedding.provider': config['embedding.provider'],
					'embedding.model': config['embedding.model'],
					'embedding.ollamaUrl': config['embedding.ollamaUrl'],
					'embedding.openaiKey': config['embedding.openaiKey'],
				},
			}),
		),
	);

	const allChunks: Chunk[] = [];
	const allEmbeddings: number[][] = [];
	for (const result of workerResults) {
		allChunks.push(...result.chunks);
		allEmbeddings.push(...result.embeddings);
	}

	const embedder = await createEmbedder(config);
	const store = createVectorStore(config['vector-store'], paths, embedder.dimensions);

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

function runWorker(input: WorkerInput): Promise<WorkerResult> {
	return new Promise((resolve, reject) => {
		const workerUrl = fileURLToPath(import.meta.url);
		const execArgv = workerUrl.endsWith('.ts')
			? ['--loader', 'ts-node/esm', '--no-warnings']
			: [];
		const worker = new Worker(workerUrl, {
			workerData: input,
			execArgv,
		});
		worker.on('message', resolve);
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
		const embedder = await createEmbedder(input.embeddingConfig as Parameters<typeof createEmbedder>[0]);

		for (const filePath of input.filePaths) {
			try {
				const fileChunks = await chunkFile(filePath);
				chunks.push(...fileChunks);
			} catch {
				// skip unreadable files
			}
		}

		const texts = chunks.map((c) => c.content);
		const embeddings = texts.length > 0 ? await embedder.embed(texts) : [];

		parentPort!.postMessage({ chunks, embeddings } satisfies WorkerResult);
	})().catch((err) => {
		throw err;
	});
}
