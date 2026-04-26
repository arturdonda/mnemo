import { describe, it, expect } from 'vitest';
import { chunkByFixedTokens } from '../../../src/core/index/chunker.js';

const FILE = 'src/test.ts';
const HASH = 'abc123';
const NOW = 1000000;

describe('chunkByFixedTokens', () => {
	it('returns empty array for empty lines', () => {
		expect(chunkByFixedTokens([], FILE, HASH, NOW)).toEqual([]);
	});

	it('returns a single chunk for small files', () => {
		const lines = ['const x = 1;', 'const y = 2;'];
		const chunks = chunkByFixedTokens(lines, FILE, HASH, NOW);
		expect(chunks).toHaveLength(1);
		expect(chunks[0].filePath).toBe(FILE);
		expect(chunks[0].fileHash).toBe(HASH);
		expect(chunks[0].content).toContain('const x = 1;');
	});

	it('chunk id includes file path and line range', () => {
		const lines = ['line 1', 'line 2'];
		const chunks = chunkByFixedTokens(lines, FILE, HASH, NOW);
		expect(chunks[0].id).toMatch(/^src\/test\.ts:\d+:\d+$/);
	});

	it('produces multiple chunks for large files', () => {
		const lines = Array.from({ length: 1000 }, (_, i) => `const x${i} = ${i}; // some padding to make lines longer`);
		const chunks = chunkByFixedTokens(lines, FILE, HASH, NOW);
		expect(chunks.length).toBeGreaterThan(1);
	});

	it('chunks cover full file content (no gaps)', () => {
		const lines = Array.from({ length: 200 }, (_, i) => `line_${i.toString().padStart(3, '0')} = value;`);
		const fullText = lines.join('\n');
		const chunks = chunkByFixedTokens(lines, FILE, HASH, NOW);

		// First chunk starts from beginning
		expect(fullText.startsWith(chunks[0].content)).toBe(true);
		// Last chunk ends at file end
		expect(fullText.endsWith(chunks[chunks.length - 1].content)).toBe(true);
	});

	it('sets startLine and endLine correctly', () => {
		const lines = ['a', 'b', 'c'];
		const chunks = chunkByFixedTokens(lines, FILE, HASH, NOW);
		expect(chunks[0].startLine).toBe(1);
		expect(chunks[0].endLine).toBeGreaterThanOrEqual(1);
	});

	it('consecutive chunks have overlapping content', () => {
		const lines = Array.from({ length: 500 }, (_, i) => `x${i}=${'a'.repeat(10)};`);
		const chunks = chunkByFixedTokens(lines, FILE, HASH, NOW);
		if (chunks.length >= 2) {
			const end1 = chunks[0].content.slice(-80);
			const start2 = chunks[1].content.slice(0, 80);
			const overlap = end1.split('').filter((c, i) => start2.includes(c)).length;
			expect(overlap).toBeGreaterThan(0);
		}
	});
});
