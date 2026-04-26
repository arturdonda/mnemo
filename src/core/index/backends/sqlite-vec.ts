import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import type { Chunk, ScoredChunk, VectorStore } from '../vector-store.js';

export class SqliteVecStore implements VectorStore {
	private db: Database.Database;
	private dimensions: number;

	constructor(dbPath: string, dimensions = 384) {
		this.dimensions = dimensions;
		this.db = new Database(dbPath);
		sqliteVec.load(this.db);
		this.init();
	}

	private init(): void {
		this.db.exec(`
      CREATE TABLE IF NOT EXISTS chunks (
        id         TEXT PRIMARY KEY,
        file_path  TEXT NOT NULL,
        start_line INTEGER NOT NULL,
        end_line   INTEGER NOT NULL,
        content    TEXT NOT NULL,
        file_hash  TEXT NOT NULL,
        indexed_at INTEGER NOT NULL
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS chunk_vectors USING vec0(
        chunk_id  TEXT PRIMARY KEY,
        embedding FLOAT[${this.dimensions}]
      );
    `);
	}

	async upsert(chunks: Chunk[], embeddings: number[][]): Promise<void> {
		const insertChunk = this.db.prepare(`
      INSERT OR REPLACE INTO chunks (id, file_path, start_line, end_line, content, file_hash, indexed_at)
      VALUES (@id, @filePath, @startLine, @endLine, @content, @fileHash, @indexedAt)
    `);

		const deleteVec = this.db.prepare(`DELETE FROM chunk_vectors WHERE chunk_id = ?`);
		const insertVec = this.db.prepare(`
      INSERT INTO chunk_vectors (chunk_id, embedding)
      VALUES (?, ?)
    `);

		const upsertAll = this.db.transaction(() => {
			for (let i = 0; i < chunks.length; i++) {
				const chunk = chunks[i];
				insertChunk.run({
					id: chunk.id,
					filePath: chunk.filePath,
					startLine: chunk.startLine,
					endLine: chunk.endLine,
					content: chunk.content,
					fileHash: chunk.fileHash,
					indexedAt: chunk.indexedAt,
				});
				deleteVec.run(chunk.id);
				insertVec.run(chunk.id, new Float32Array(embeddings[i]));
			}
		});

		upsertAll();
	}

	async query(embedding: number[], topK: number): Promise<ScoredChunk[]> {
		const vec = new Float32Array(embedding);
		const rows = this.db
			.prepare(`
        SELECT c.*, v.distance
        FROM chunk_vectors v
        JOIN chunks c ON c.id = v.chunk_id
        WHERE v.embedding MATCH ?
          AND k = ?
        ORDER BY v.distance
      `)
			.all(vec, topK) as Array<{
			id: string;
			file_path: string;
			start_line: number;
			end_line: number;
			content: string;
			file_hash: string;
			indexed_at: number;
			distance: number;
		}>;

		return rows.map((r) => ({
			id: r.id,
			filePath: r.file_path,
			startLine: r.start_line,
			endLine: r.end_line,
			content: r.content,
			fileHash: r.file_hash,
			indexedAt: r.indexed_at,
			score: 1 - r.distance,
		}));
	}

	async delete(filePathPrefix: string): Promise<void> {
		const ids = this.db
			.prepare(`SELECT id FROM chunks WHERE file_path LIKE ?`)
			.all(`${filePathPrefix}%`) as Array<{ id: string }>;

		const del = this.db.transaction(() => {
			for (const { id } of ids) {
				this.db.prepare(`DELETE FROM chunk_vectors WHERE chunk_id = ?`).run(id);
				this.db.prepare(`DELETE FROM chunks WHERE id = ?`).run(id);
			}
		});
		del();
	}

	async close(): Promise<void> {
		this.db.close();
	}
}
