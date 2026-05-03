import { Command } from 'commander';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import Database from 'better-sqlite3';
import { resolveProjectId } from '../core/project.js';
import { getPaths } from '../core/paths.js';
import { readConfig } from '../core/config.js';
import { handleError } from '../core/error.js';

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export function createStatusCommand(): Command {
	return new Command('status')
		.description('Show the health summary of the Cross Context index')
		.action(async () => {
			try {
				const cwd = process.cwd();
				const projectId = await resolveProjectId(cwd);
				const paths = getPaths(projectId);

				if (!existsSync(paths.projectMeta)) {
					console.log('Project not initialized. Run `xctx init` first.');
					return;
				}

				const metaRaw = await readFile(paths.projectMeta, 'utf-8');
				const meta = JSON.parse(metaRaw) as { name: string };
				const config = await readConfig();
				const dbPath = join(paths.projectRoot, 'index.db');

				console.log(`Project: ${meta.name}`);
				console.log(`ID:      ${projectId}`);
				console.log(`Provider: ${config['embedding.provider']} (${config['embedding.model']})`);
				console.log(`Store:   ${config['vector-store']}`);

				if (!existsSync(dbPath)) {
					console.log('\nIndex: not built. Run `xctx update` to index the project.');
					return;
				}

				const { filesIndexed, totalChunks, lastIndexed } = getIndexStats(dbPath);
				console.log(`\nFiles indexed: ${filesIndexed}`);
				console.log(`Total chunks:  ${totalChunks}`);

				if (lastIndexed) {
					const date = new Date(lastIndexed).toISOString().replace('T', ' ').slice(0, 19);
					console.log(`Last indexed:  ${date}`);

					const age = Date.now() - lastIndexed;
					if (age > STALE_THRESHOLD_MS) {
						const hours = Math.round(age / 3600000);
						console.log(`\nWarning: index is ${hours}h old with no commit. Run \`xctx update\`.`);
					}
				}
			} catch (e) {
				handleError(e);
			}
		});
}

function getIndexStats(dbPath: string): { filesIndexed: number; totalChunks: number; lastIndexed: number | null } {
	let db: Database.Database | null = null;
	try {
		db = new Database(dbPath, { readonly: true });
		const row = db.prepare(`SELECT COUNT(DISTINCT file_path) as files, COUNT(*) as chunks, MAX(indexed_at) as last FROM chunks`).get() as {
			files: number;
			chunks: number;
			last: number | null;
		};
		return { filesIndexed: row.files, totalChunks: row.chunks, lastIndexed: row.last };
	} catch {
		return { filesIndexed: 0, totalChunks: 0, lastIndexed: null };
	} finally {
		db?.close();
	}
}
