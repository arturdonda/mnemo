import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import * as ort from 'onnxruntime-node';
import type { Embedder } from '../embedder.js';
import { MODELS_DIR, ensureModel } from '../../models/download.js';

const MODEL_NAME = 'all-MiniLM-L6-v2';
const MODEL_URL = `https://huggingface.co/sentence-transformers/${MODEL_NAME}/resolve/main/onnx/model.onnx`;
const VOCAB_URL = `https://huggingface.co/sentence-transformers/${MODEL_NAME}/resolve/main/tokenizer.json`;

export const ONNX_DIMENSIONS = 384;

export class OnnxEmbedder implements Embedder {
	readonly dimensions = ONNX_DIMENSIONS;
	private session: ort.InferenceSession | null = null;
	private vocab: Map<string, number> | null = null;

	async embed(texts: string[]): Promise<number[][]> {
		await this.ensureLoaded();
		return Promise.all(texts.map((t) => this.embedOne(t)));
	}

	private async ensureLoaded(): Promise<void> {
		if (this.session) return;
		const modelPath = join(MODELS_DIR, `${MODEL_NAME}.onnx`);
		const vocabPath = join(MODELS_DIR, `${MODEL_NAME}.tokenizer.json`);

		await ensureModel(MODEL_NAME, MODEL_URL, modelPath);
		await ensureModel(`${MODEL_NAME}.tokenizer`, VOCAB_URL, vocabPath);

		this.session = await ort.InferenceSession.create(modelPath);
		const vocabRaw = JSON.parse(await readFile(vocabPath, 'utf-8')) as {
			model?: { vocab?: Record<string, number> };
		};
		this.vocab = new Map(Object.entries(vocabRaw.model?.vocab ?? {}));
	}

	private async embedOne(text: string): Promise<number[]> {
		const tokens = this.tokenize(text);
		const inputIds = new ort.Tensor('int64', BigInt64Array.from(tokens.map(BigInt)), [1, tokens.length]);
		const attentionMask = new ort.Tensor('int64', BigInt64Array.from(tokens.map(() => 1n)), [1, tokens.length]);
		const tokenTypeIds = new ort.Tensor('int64', new BigInt64Array(tokens.length), [1, tokens.length]);

		const output = await this.session!.run({ input_ids: inputIds, attention_mask: attentionMask, token_type_ids: tokenTypeIds });
		const lastHidden = output['last_hidden_state'] ?? output[Object.keys(output)[0]];
		const data = lastHidden.data as Float32Array;
		const seqLen = tokens.length;

		// mean pooling
		const embedding = new Array<number>(ONNX_DIMENSIONS).fill(0);
		for (let t = 0; t < seqLen; t++) {
			for (let d = 0; d < ONNX_DIMENSIONS; d++) {
				embedding[d] += data[t * ONNX_DIMENSIONS + d];
			}
		}
		for (let d = 0; d < ONNX_DIMENSIONS; d++) embedding[d] /= seqLen;

		return normalize(embedding);
	}

	private tokenize(text: string): number[] {
		const vocab = this.vocab!;
		const unk = vocab.get('[UNK]') ?? 100;
		const cls = vocab.get('[CLS]') ?? 101;
		const sep = vocab.get('[SEP]') ?? 102;

		const wordPieces = text
			.toLowerCase()
			.replace(/[^a-z0-9\s]/g, ' ')
			.split(/\s+/)
			.filter(Boolean)
			.flatMap((word) => wordpieceTokenize(word, vocab, unk));

		const ids = [cls, ...wordPieces.slice(0, 510), sep];
		return ids;
	}
}

function wordpieceTokenize(word: string, vocab: Map<string, number>, unk: number): number[] {
	if (vocab.has(word)) return [vocab.get(word)!];

	const tokens: number[] = [];
	let start = 0;
	while (start < word.length) {
		let end = word.length;
		let found = false;
		while (start < end) {
			const sub = start === 0 ? word.slice(start, end) : `##${word.slice(start, end)}`;
			if (vocab.has(sub)) {
				tokens.push(vocab.get(sub)!);
				start = end;
				found = true;
				break;
			}
			end--;
		}
		if (!found) return [unk];
	}
	return tokens;
}

function normalize(v: number[]): number[] {
	const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
	if (norm === 0) return v;
	return v.map((x) => x / norm);
}

