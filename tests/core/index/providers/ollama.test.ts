import { describe, it, expect, vi } from 'vitest';
import { OllamaEmbedder } from '../../../../src/core/index/providers/ollama.js';

describe('OllamaEmbedder', () => {
	it('calls Ollama HTTP API and returns embeddings', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ embedding: [0.1, 0.2, 0.3] }),
		});
		const embedder = new OllamaEmbedder('nomic-embed-text', 'http://localhost:11434', mockFetch as unknown as typeof fetch);
		const result = await embedder.embed(['hello world']);

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual([0.1, 0.2, 0.3]);
		expect(mockFetch).toHaveBeenCalledWith(
			'http://localhost:11434/api/embeddings',
			expect.objectContaining({ method: 'POST' }),
		);
	});

	it('throws on non-ok response', async () => {
		const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' });
		const embedder = new OllamaEmbedder('nomic-embed-text', 'http://localhost:11434', mockFetch as unknown as typeof fetch);
		await expect(embedder.embed(['hello'])).rejects.toThrow('Ollama embedding failed');
	});

	it('calls once per text in batch', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ embedding: [1, 0, 0] }),
		});
		const embedder = new OllamaEmbedder('nomic-embed-text', 'http://localhost:11434', mockFetch as unknown as typeof fetch);
		const result = await embedder.embed(['a', 'b', 'c']);
		expect(result).toHaveLength(3);
		expect(mockFetch).toHaveBeenCalledTimes(3);
	});
});
