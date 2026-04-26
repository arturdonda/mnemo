import { xxh3 } from '@node-rs/xxhash';
import { readFile } from 'node:fs/promises';
import { parseFile } from './parser.js';
import { GraphStore } from './store.js';
import { getPaths } from '../paths.js';

export type GraphIndexStats = {
	filesIndexed: number;
	durationMs: number;
};

export async function indexGraphFiles(filePaths: string[], projectId: string): Promise<GraphIndexStats> {
	const start = Date.now();
	const paths = getPaths(projectId);
	const store = new GraphStore(paths.graphDb);

	try {
		let indexed = 0;
		for (const filePath of filePaths) {
			try {
				const content = await readFile(filePath, 'utf-8');
				const hash = xxh3.xxh64(content).toString(16);
				const parsed = await parseFile(filePath);
				store.upsertFile(parsed, hash);
				indexed++;
			} catch {
				// skip unreadable files
			}
		}
		return { filesIndexed: indexed, durationMs: Date.now() - start };
	} finally {
		store.close();
	}
}
