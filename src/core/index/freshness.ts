import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { xxh3 } from '@node-rs/xxhash';
import type { VectorStore, ScoredChunk, Chunk } from './vector-store.js';
import type { Embedder } from './embedder.js';
import { chunkFile } from './chunker.js';

export async function queryWithFreshness(
	store: VectorStore,
	embedder: Embedder,
	embedding: number[],
	topK: number,
): Promise<ScoredChunk[]> {
	const results = await store.query(embedding, topK);

	const staleFiles = new Set<string>();
	for (const chunk of results) {
		if (!existsSync(chunk.filePath)) continue;
		const content = await readFile(chunk.filePath, 'utf-8');
		const currentHash = xxh3.xxh64(content).toString(16).padStart(16, '0');
		if (currentHash !== chunk.fileHash) {
			staleFiles.add(chunk.filePath);
		}
	}

	if (staleFiles.size > 0) {
		await reindexFiles(store, embedder, Array.from(staleFiles));
		return store.query(embedding, topK);
	}

	return results;
}

async function reindexFiles(store: VectorStore, embedder: Embedder, filePaths: string[]): Promise<void> {
	const allChunks: Chunk[] = [];
	for (const filePath of filePaths) {
		await store.delete(filePath);
		try {
			const chunks = await chunkFile(filePath);
			allChunks.push(...chunks);
		} catch {
			// file removed or unreadable — already deleted from store
		}
	}

	if (allChunks.length > 0) {
		const texts = allChunks.map((c) => c.content);
		const embeddings = await embedder.embed(texts);
		await store.upsert(allChunks, embeddings);
	}
}
