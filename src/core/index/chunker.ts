import { readFile } from 'node:fs/promises';
import { xxh3 } from '@node-rs/xxhash';
import type { Chunk } from './vector-store.js';

const CHUNK_TOKENS = 200;
const OVERLAP_TOKENS = 20;
const AVG_CHARS_PER_TOKEN = 4;

const CHUNK_SIZE = CHUNK_TOKENS * AVG_CHARS_PER_TOKEN;
const OVERLAP_SIZE = OVERLAP_TOKENS * AVG_CHARS_PER_TOKEN;

export async function chunkFile(filePath: string): Promise<Chunk[]> {
	const content = await readFile(filePath, 'utf-8');
	const fileHash = xxh3.xxh64(content).toString(16).padStart(16, '0');
	const lines = content.split('\n');
	const now = Date.now();

	return chunkByFixedTokens(lines, filePath, fileHash, now);
}

export function chunkByFixedTokens(
	lines: string[],
	filePath: string,
	fileHash: string,
	indexedAt: number,
): Chunk[] {
	if (lines.length === 0) return [];

	const chunks: Chunk[] = [];
	const fullText = lines.join('\n');

	let start = 0;
	while (start < fullText.length) {
		const end = Math.min(start + CHUNK_SIZE, fullText.length);
		const slice = fullText.slice(start, end);

		const startLine = countLines(fullText, 0, start);
		const endLine = countLines(fullText, 0, end);

		chunks.push({
			id: `${filePath}:${startLine}:${endLine}`,
			filePath,
			startLine,
			endLine,
			content: slice,
			fileHash,
			indexedAt,
		});

		if (end === fullText.length) break;
		start = end - OVERLAP_SIZE;
	}

	return chunks;
}

function countLines(text: string, from: number, to: number): number {
	let count = 1;
	for (let i = from; i < to; i++) {
		if (text[i] === '\n') count++;
	}
	return count;
}
