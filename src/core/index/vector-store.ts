export type Chunk = {
	id: string;
	filePath: string;
	startLine: number;
	endLine: number;
	content: string;
	fileHash: string;
	indexedAt: number;
};

export type ScoredChunk = Chunk & { score: number };

export interface VectorStore {
	upsert(chunks: Chunk[], embeddings: number[][]): Promise<void>;
	query(embedding: number[], topK: number): Promise<ScoredChunk[]>;
	delete(filePathPrefix: string): Promise<void>;
	close(): Promise<void>;
}
