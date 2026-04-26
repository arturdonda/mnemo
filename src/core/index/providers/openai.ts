import type { Embedder } from '../embedder.js';

export class OpenAIEmbedder implements Embedder {
	readonly dimensions = 1536;

	constructor(
		private readonly model: string,
		private readonly apiKey: string,
		private readonly fetchFn: typeof fetch = globalThis.fetch,
	) {}

	async embed(texts: string[]): Promise<number[][]> {
		const res = await this.fetchFn('https://api.openai.com/v1/embeddings', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${this.apiKey}`,
			},
			body: JSON.stringify({ model: this.model, input: texts }),
		});
		if (!res.ok) {
			throw new Error(`OpenAI embedding failed: ${res.status} ${res.statusText}`);
		}
		const data = (await res.json()) as { data: Array<{ embedding: number[] }> };
		return data.data.map((d) => d.embedding);
	}
}
