import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('createEmbedder', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.resetModules();
	});

	it('returns OnnxEmbedder by default', async () => {
		vi.doMock('../../../src/core/index/providers/onnx.js', () => ({
			OnnxEmbedder: class {
				dimensions = 384;
				async embed() { return [[]]; }
			},
		}));
		const { createEmbedder } = await import('../../../src/core/index/embedder.js');
		const embedder = await createEmbedder({
			'embedding.provider': 'onnx',
			'embedding.model': 'all-MiniLM-L6-v2',
			'embedding.ollamaUrl': 'http://localhost:11434',
			'embedding.openaiKey': '',
		});
		expect(embedder.dimensions).toBe(384);
	});

	it('returns OllamaEmbedder when provider is ollama', async () => {
		vi.doMock('../../../src/core/index/providers/ollama.js', () => ({
			OllamaEmbedder: class {
				dimensions = 768;
				async embed() { return [[]]; }
			},
		}));
		const { createEmbedder } = await import('../../../src/core/index/embedder.js');
		const embedder = await createEmbedder({
			'embedding.provider': 'ollama',
			'embedding.model': 'nomic-embed-text',
			'embedding.ollamaUrl': 'http://localhost:11434',
			'embedding.openaiKey': '',
		});
		expect(embedder.dimensions).toBe(768);
	});

	it('returns OpenAIEmbedder when provider is openai', async () => {
		vi.doMock('../../../src/core/index/providers/openai.js', () => ({
			OpenAIEmbedder: class {
				dimensions = 1536;
				async embed() { return [[]]; }
			},
		}));
		const { createEmbedder } = await import('../../../src/core/index/embedder.js');
		const embedder = await createEmbedder({
			'embedding.provider': 'openai',
			'embedding.model': 'text-embedding-3-small',
			'embedding.ollamaUrl': 'http://localhost:11434',
			'embedding.openaiKey': 'sk-test',
		});
		expect(embedder.dimensions).toBe(1536);
	});
});
