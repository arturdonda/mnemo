import Database from 'better-sqlite3';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import type { ParsedFile } from './parser.js';

export type GraphNode = {
	id: string;
	type: 'file' | 'class' | 'function';
	filePath: string;
	name: string;
	startLine: number;
	endLine: number;
	fileHash: string;
};

export type GraphEdge = {
	fromId: string;
	toId: string;
	type: 'imports' | 'exports';
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS nodes (
  id         TEXT PRIMARY KEY,
  type       TEXT NOT NULL,
  file_path  TEXT NOT NULL,
  name       TEXT NOT NULL,
  start_line INTEGER NOT NULL,
  end_line   INTEGER NOT NULL,
  file_hash  TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS edges (
  from_id TEXT NOT NULL,
  to_id   TEXT NOT NULL,
  type    TEXT NOT NULL,
  PRIMARY KEY (from_id, to_id, type)
);

CREATE INDEX IF NOT EXISTS idx_edges_from ON edges(from_id);
CREATE INDEX IF NOT EXISTS idx_edges_to   ON edges(to_id);
CREATE INDEX IF NOT EXISTS idx_nodes_file ON nodes(file_path);
`;

export class GraphStore {
	private db: InstanceType<typeof Database>;

	constructor(dbPath: string) {
		this.db = new Database(dbPath);
		this.db.exec(SCHEMA);
	}

	upsertFile(file: ParsedFile, fileHash = '', projectRoot = ''): void {
		// When projectRoot is known, store project-relative paths so getDeps/getRefs/getAffected
		// can be queried with the same relative format used by resolveImport().
		const root = projectRoot.replace(/\\/g, '/').replace(/\/$/, '');
		const absFilePath = file.filePath.replace(/\\/g, '/');
		const fileId = root && absFilePath.startsWith(root + '/') ? absFilePath.slice(root.length + 1) : file.filePath;

		this.db.transaction(() => {
			this.db.prepare(`DELETE FROM edges WHERE from_id = ?`).run(fileId);
			this.db.prepare(`DELETE FROM nodes WHERE file_path = ?`).run(fileId);

			this.db
				.prepare(
					`INSERT INTO nodes (id, type, file_path, name, start_line, end_line, file_hash)
           VALUES (?, 'file', ?, ?, 0, 0, ?)`,
				)
				.run(fileId, fileId, fileId, fileHash);

			for (const sym of file.functions) {
				const symId = `${fileId}::${sym}`;
				this.db
					.prepare(
						`INSERT OR REPLACE INTO nodes (id, type, file_path, name, start_line, end_line, file_hash)
             VALUES (?, 'function', ?, ?, 0, 0, ?)`,
					)
					.run(symId, fileId, sym, fileHash);
			}

			for (const sym of file.classes) {
				const symId = `${fileId}::${sym}`;
				this.db
					.prepare(
						`INSERT OR REPLACE INTO nodes (id, type, file_path, name, start_line, end_line, file_hash)
             VALUES (?, 'class', ?, ?, 0, 0, ?)`,
					)
					.run(symId, fileId, sym, fileHash);
			}

			for (const imp of file.imports) {
				// When projectRoot is provided, resolve to project-relative paths (enables cross-file refs).
				// When omitted (tests / legacy callers), store raw import strings as before.
				const toId = projectRoot ? this.resolveImport(imp, fileId, projectRoot) : imp;
				if (toId) {
					this.db.prepare(`INSERT OR IGNORE INTO edges (from_id, to_id, type) VALUES (?, ?, 'imports')`).run(fileId, toId);
				}
			}

			for (const exp of file.exports) {
				this.db.prepare(`INSERT OR IGNORE INTO edges (from_id, to_id, type) VALUES (?, ?, 'exports')`).run(fileId, exp);
			}
		})();
	}

	private resolveImport(rawImport: string, fromFile: string, projectRoot: string): string | null {
		// External packages (node_modules) — not resolvable to project files
		if (!rawImport.startsWith('.') && !rawImport.startsWith('/')) return null;
		if (!projectRoot) return null;

		const fromDir = dirname(fromFile);
		const base = resolve(fromDir, rawImport).replace(/\\/g, '/');
		const root = projectRoot.replace(/\\/g, '/').replace(/\/$/, '');

		// Try candidate paths in order: exact, then common source extensions
		const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.mjs`, `${base}/index.ts`, `${base}/index.js`];
		for (const candidate of candidates) {
			if (candidate.startsWith(root + '/') && existsSync(candidate)) {
				return candidate.slice(root.length + 1);
			}
		}
		// If file doesn't exist yet (during indexing of new files), store normalized path anyway
		if (base.startsWith(root + '/')) {
			return base.slice(root.length + 1);
		}
		return null;
	}

	deleteFile(filePath: string): void {
		this.db.transaction(() => {
			this.db.prepare(`DELETE FROM edges WHERE from_id = ? OR to_id LIKE ?`).run(filePath, `${filePath}::%`);
			this.db.prepare(`DELETE FROM nodes WHERE file_path = ?`).run(filePath);
		})();
	}

	getDeps(filePath: string): string[] {
		const rows = this.db
			.prepare(`SELECT to_id FROM edges WHERE from_id = ? AND type = 'imports'`)
			.all(filePath) as { to_id: string }[];
		return rows.map((r) => r.to_id);
	}

	getRefs(filePath: string): string[] {
		const rows = this.db
			.prepare(`SELECT from_id FROM edges WHERE to_id = ? AND type = 'imports'`)
			.all(filePath) as { from_id: string }[];
		return rows.map((r) => r.from_id);
	}

	getIndexedHashes(): Map<string, string> {
		const rows = this.db
			.prepare(`SELECT file_path, file_hash FROM nodes WHERE type = 'file'`)
			.all() as { file_path: string; file_hash: string }[];
		return new Map(rows.map((r) => [r.file_path, r.file_hash]));
	}

	countEdges(): number {
		const row = this.db.prepare(`SELECT COUNT(*) as n FROM edges`).get() as { n: number };
		return row.n;
	}

	getAffected(filePath: string, maxDepth = 3): string[] {
		const visited = new Set<string>();
		const queue: Array<{ id: string; depth: number }> = [{ id: filePath, depth: 0 }];

		while (queue.length > 0) {
			const item = queue.shift()!;
			if (item.depth >= maxDepth) continue;

			const refs = this.getRefs(item.id);
			for (const ref of refs) {
				if (!visited.has(ref)) {
					visited.add(ref);
					queue.push({ id: ref, depth: item.depth + 1 });
				}
			}
		}

		return [...visited];
	}

	getSymbols(filePath: string): { name: string; type: 'function' | 'class' }[] {
		const rows = this.db
			.prepare(`SELECT name, type FROM nodes WHERE file_path = ? AND type IN ('function', 'class') ORDER BY name`)
			.all(filePath) as { name: string; type: 'function' | 'class' }[];
		return rows;
	}

	close(): void {
		this.db.close();
	}
}
