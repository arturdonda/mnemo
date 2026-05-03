import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm } from 'node:fs/promises';
import { GraphStore } from '../../../src/core/graph/store.js';
import { applyHybridScoring } from '../../../src/core/index/hybrid.js';
import type { ScoredChunk } from '../../../src/core/index/vector-store.js';

let store: GraphStore;
let dbPath: string;

beforeEach(() => {
	dbPath = join(tmpdir(), `xctx-hybrid-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
	store = new GraphStore(dbPath);
});

afterEach(async () => {
	store.close();
	await rm(dbPath, { force: true });
});

function chunk(filePath: string, score: number): ScoredChunk {
	return { id: `${filePath}:1:10`, filePath, startLine: 1, endLine: 10, content: 'test', fileHash: '', indexedAt: 0, score };
}

describe('applyHybridScoring', () => {
	it('ranks feat-linked file higher than an equally-similar unlinked file', async () => {
		const linked = chunk('src/linked.ts', 0.8);
		const unlinked = chunk('src/unlinked.ts', 0.8);

		const results = await applyHybridScoring([linked, unlinked], {
			graphStore: store,
			featLinkedFiles: ['src/linked.ts'],
		});

		expect(results[0].filePath).toBe('src/linked.ts');
	});

	it('returns empty array for empty input', async () => {
		const results = await applyHybridScoring([], { graphStore: store, featLinkedFiles: [] });
		expect(results).toHaveLength(0);
	});

	it('applies graph proximity bonus to deps of feat-linked files', async () => {
		// feat links to A, which imports B — B should get graph proximity bonus
		store.upsertFile({ filePath: 'A.ts', imports: ['B.ts'], exports: [], functions: [], classes: [] });

		const a = chunk('A.ts', 0.5);
		const b = chunk('B.ts', 0.5);
		const c = chunk('C.ts', 0.5); // no relation

		const results = await applyHybridScoring([a, b, c], {
			graphStore: store,
			featLinkedFiles: ['A.ts'],
		});

		const scores = Object.fromEntries(results.map((r) => [r.filePath, r.score]));
		expect(scores['A.ts']).toBeGreaterThan(scores['B.ts']);
		expect(scores['B.ts']).toBeGreaterThan(scores['C.ts']);
	});

	it('preserves descending score order', async () => {
		const results = await applyHybridScoring(
			[chunk('a.ts', 0.9), chunk('b.ts', 0.1), chunk('c.ts', 0.5)],
			{ graphStore: store, featLinkedFiles: [] },
		);
		for (let i = 1; i < results.length; i++) {
			expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
		}
	});
});
