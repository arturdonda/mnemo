import { describe, it, expect, vi } from 'vitest';
import { OpenAIEmbedder } from '../../../../src/core/index/providers/openai.js';

describe('OpenAIEmbedder', () => {
	it('calls OpenAI API and returns embeddings', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ data: [{ embedding: [0.4, 0.5, 0.6] }] }),
		});
		const embedder = new OpenAIEmbedder('text-embedding-3-small', 'sk-test', mockFetch as unknown as typeof fetch);
		const result = await embedder.embed(['hello world']);

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual([0.4, 0.5, 0.6]);
		expect(mockFetch).toHaveBeenCalledWith(
			'https://api.openai.com/v1/embeddings',
			expect.objectContaining({ method: 'POST' }),
		);
	});

	it('batches all texts in single request', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ data: [{ embedding: [1, 0] }, { embedding: [0, 1] }] }),
		});
		const embedder = new OpenAIEmbedder('text-embedding-3-small', 'sk-test', mockFetch as unknown as typeof fetch);
		const result = await embedder.embed(['a', 'b']);
		expect(result).toHaveLength(2);
		expect(mockFetch).toHaveBeenCalledTimes(1);
	});

	it('throws on non-ok response', async () => {
		const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' });
		const embedder = new OpenAIEmbedder('text-embedding-3-small', 'bad-key', mockFetch as unknown as typeof fetch);
		await expect(embedder.embed(['hello'])).rejects.toThrow('OpenAI embedding failed');
	});
});
