import type { MnemoConfig } from '../config.js';

export interface Embedder {
	embed(texts: string[]): Promise<number[][]>;
	readonly dimensions: number;
}

export async function createEmbedder(config: Pick<MnemoConfig, 'embedding.provider' | 'embedding.model' | 'embedding.ollamaUrl' | 'embedding.openaiKey'>): Promise<Embedder> {
	const provider = config['embedding.provider'];

	if (provider === 'ollama') {
		const { OllamaEmbedder } = await import('./providers/ollama.js');
		return new OllamaEmbedder(config['embedding.model'], config['embedding.ollamaUrl']);
	}

	if (provider === 'openai') {
		const { OpenAIEmbedder } = await import('./providers/openai.js');
		return new OpenAIEmbedder(config['embedding.model'], config['embedding.openaiKey']);
	}

	const { OnnxEmbedder } = await import('./providers/onnx.js');
	return new OnnxEmbedder();
}
