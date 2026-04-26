import type { Embedder } from '../embedder.js';

export class OllamaEmbedder implements Embedder {
	readonly dimensions = 768;

	constructor(
		private readonly model: string,
		private readonly baseUrl: string,
		private readonly fetchFn: typeof fetch = globalThis.fetch,
	) {}

	async embed(texts: string[]): Promise<number[][]> {
		const results: number[][] = [];
		for (const text of texts) {
			const res = await this.fetchFn(`${this.baseUrl}/api/embeddings`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ model: this.model, prompt: text }),
			});
			if (!res.ok) {
				throw new Error(`Ollama embedding failed: ${res.status} ${res.statusText}`);
			}
			const data = (await res.json()) as { embedding: number[] };
			results.push(data.embedding);
		}
		return results;
	}
}
