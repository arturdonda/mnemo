import * as lancedb from '@lancedb/lancedb';
import { join } from 'node:path';
import type { Chunk, ScoredChunk, VectorStore } from '../vector-store.js';

type LanceRow = {
	id: string;
	vector: number[];
	file_path: string;
	start_line: number;
	end_line: number;
	content: string;
	file_hash: string;
	indexed_at: number;
	_distance?: number;
};

export class LanceDbStore implements VectorStore {
	private db!: lancedb.Connection;
	private table!: lancedb.Table;
	private dbPath: string;
	private dimensions: number;
	private ready: Promise<void>;

	constructor(dbPath: string, dimensions = 384) {
		this.dbPath = dbPath;
		this.dimensions = dimensions;
		this.ready = this.init();
	}

	private async init(): Promise<void> {
		this.db = await lancedb.connect(this.dbPath);
		const tableNames = await this.db.tableNames();

		if (tableNames.includes('chunks')) {
			this.table = await this.db.openTable('chunks');
		} else {
			// create with a dummy row to establish schema, then delete it
			this.table = await this.db.createTable('chunks', [
				{
					id: '__init__',
					vector: new Array<number>(this.dimensions).fill(0),
					file_path: '',
					start_line: 0,
					end_line: 0,
					content: '',
					file_hash: '',
					indexed_at: 0,
				},
			]);
			await this.table.delete("id = '__init__'");
		}
	}

	async upsert(chunks: Chunk[], embeddings: number[][]): Promise<void> {
		await this.ready;
		if (chunks.length === 0) return;

		const rows: LanceRow[] = chunks.map((c, i) => ({
			id: c.id,
			vector: embeddings[i],
			file_path: c.filePath,
			start_line: c.startLine,
			end_line: c.endLine,
			content: c.content,
			file_hash: c.fileHash,
			indexed_at: c.indexedAt,
		}));

		await this.table
			.mergeInsert('id')
			.whenMatchedUpdateAll()
			.whenNotMatchedInsertAll()
			.execute(rows);
	}

	async query(embedding: number[], topK: number): Promise<ScoredChunk[]> {
		await this.ready;
		const results = await this.table.vectorSearch(embedding).limit(topK).toArray() as LanceRow[];

		return results.map((r) => ({
			id: r.id,
			filePath: r.file_path,
			startLine: r.start_line,
			endLine: r.end_line,
			content: r.content,
			fileHash: r.file_hash,
			indexedAt: r.indexed_at,
			score: r._distance !== undefined ? 1 - r._distance : 0,
		}));
	}

	async delete(filePathPrefix: string): Promise<void> {
		await this.ready;
		await this.table.delete(`file_path = '${filePathPrefix.replace(/'/g, "''")}'`);
	}

	async close(): Promise<void> {
		// LanceDB connections are not explicitly closed in the JS SDK
	}
}
