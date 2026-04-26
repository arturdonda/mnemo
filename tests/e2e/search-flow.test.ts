import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm, mkdir, writeFile } from 'node:fs/promises';
import { indexFiles } from '../../src/core/index/pipeline.js';
import { getPaths } from '../../src/core/paths.js';
import { SqliteVecStore } from '../../src/core/index/backends/sqlite-vec.js';
import { createEmbedder } from '../../src/core/index/embedder.js';
import { readConfig } from '../../src/core/config.js';
import { resolveProjectId } from '../../src/core/project.js';

let tempDir: string;
let projectId: string;

beforeAll(async () => {
	tempDir = join(tmpdir(), `mnemo-e2e-search-${Date.now()}`);
	await mkdir(tempDir, { recursive: true });

	// write fixture source files
	await writeFile(join(tempDir, 'auth.ts'), `
export function authenticateUser(token: string): boolean {
  return token.startsWith('Bearer ');
}

export function generateToken(userId: string): string {
  return 'Bearer ' + userId;
}
`, 'utf-8');

	await writeFile(join(tempDir, 'database.ts'), `
export async function queryDatabase(sql: string): Promise<unknown[]> {
  return [];
}

export function connectToDatabase(url: string): void {
  // connect
}
`, 'utf-8');

	projectId = await resolveProjectId(tempDir);
	const paths = getPaths(projectId);
	await mkdir(paths.projectRoot, { recursive: true });
	await writeFile(paths.projectMeta, JSON.stringify({ id: projectId, createdAt: Date.now() }), 'utf-8');
});

afterAll(async () => {
	await rm(tempDir, { recursive: true, force: true });
});

describe('search flow — update then search', () => {
	it('indexes files and retrieves relevant results for a query', async () => {
		const filePaths = [join(tempDir, 'auth.ts'), join(tempDir, 'database.ts')];

		let stats: Awaited<ReturnType<typeof indexFiles>>;
		try {
			stats = await indexFiles(filePaths, projectId);
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			// skip if embedder model is unavailable (no network / no API key)
			if (msg.includes('401') || msg.includes('download') || msg.includes('ENOTFOUND')) {
				console.warn('Skipping search e2e: embedder model unavailable —', msg.slice(0, 80));
				return;
			}
			throw e;
		}

		expect(stats.filesIndexed).toBeGreaterThan(0);
		expect(stats.chunksCreated).toBeGreaterThan(0);

		const config = await readConfig();
		const embedder = await createEmbedder(config);
		const paths = getPaths(projectId);
		const store = new SqliteVecStore(paths.indexDb, embedder.dimensions);

		try {
			const [embedding] = await embedder.embed(['user authentication token']);
			const results = await store.query(embedding, 5);

			expect(results.length).toBeGreaterThan(0);
			const authResult = results.find((r) => r.filePath.includes('auth.ts'));
			expect(authResult).toBeDefined();
		} finally {
			await store.close();
		}
	}, 60_000);
});
