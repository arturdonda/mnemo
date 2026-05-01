import { xxh3 } from '@node-rs/xxhash';
import { readFile } from 'node:fs/promises';
import { simpleGit } from 'simple-git';
import { parseFile } from './parser.js';
import { GraphStore } from './store.js';
import { getPaths } from '../paths.js';

export type GraphIndexStats = {
	filesIndexed: number;
	unchanged: number;
	durationMs: number;
};

async function detectProjectRoot(cwd: string): Promise<string> {
	try {
		const git = simpleGit(cwd);
		const root = await git.revparse(['--show-toplevel']);
		return root.trim().replace(/\\/g, '/');
	} catch {
		return cwd.replace(/\\/g, '/');
	}
}

export async function indexGraphFiles(
	filePaths: string[],
	projectId: string,
	onProgress?: (done: number, total: number) => void,
): Promise<GraphIndexStats> {
	const start = Date.now();
	const paths = getPaths(projectId);
	const store = new GraphStore(paths.graphDb);
	const projectRoot = await detectProjectRoot(process.cwd());

	try {
		// Project-relative paths of all files currently on disk
		const currentRelPaths = new Set(
			filePaths
				.map((p) => p.replace(/\\/g, '/'))
				.filter((p) => p.startsWith(projectRoot + '/'))
				.map((p) => p.slice(projectRoot.length + 1)),
		);

		// Remove graph nodes for files deleted from disk
		const indexedHashes = store.getIndexedHashes();
		for (const relPath of indexedHashes.keys()) {
			if (!currentRelPaths.has(relPath)) {
				store.deleteFile(relPath);
			}
		}

		let indexed = 0;
		let unchanged = 0;

		for (const filePath of filePaths) {
			const absPath = filePath.replace(/\\/g, '/');
			const relPath = absPath.startsWith(projectRoot + '/') ? absPath.slice(projectRoot.length + 1) : absPath;

			try {
				const content = await readFile(filePath, 'utf-8');
				const hash = xxh3.xxh64(content).toString(16);

				if (indexedHashes.get(relPath) === hash) {
					unchanged++;
				} else {
					const parsed = await parseFile(filePath);
					store.upsertFile(parsed, hash, projectRoot);
					indexed++;
				}
			} catch {
				// skip unreadable files
			}
			onProgress?.(indexed + unchanged, filePaths.length);
		}

		return { filesIndexed: indexed, unchanged, durationMs: Date.now() - start };
	} finally {
		store.close();
	}
}
