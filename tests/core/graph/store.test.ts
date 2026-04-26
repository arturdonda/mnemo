import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm } from 'node:fs/promises';
import { GraphStore } from '../../../src/core/graph/store.js';
import type { ParsedFile } from '../../../src/core/graph/parser.js';

let store: GraphStore;
let dbPath: string;

beforeEach(() => {
	dbPath = join(tmpdir(), `mnemo-graph-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
	store = new GraphStore(dbPath);
});

afterEach(async () => {
	store.close();
	await rm(dbPath, { force: true });
});

function makeFile(filePath: string, overrides: Partial<ParsedFile> = {}): ParsedFile {
	return { filePath, imports: [], exports: [], functions: [], classes: [], ...overrides };
}

describe('GraphStore — upsertFile', () => {
	it('stores a file node', () => {
		store.upsertFile(makeFile('src/a.ts'));
		const symbols = store.getSymbols('src/a.ts');
		expect(symbols).toHaveLength(0);
	});

	it('stores function and class symbols', () => {
		store.upsertFile(makeFile('src/b.ts', { functions: ['doWork', 'helper'], classes: ['MyClass'] }));
		const symbols = store.getSymbols('src/b.ts');
		expect(symbols.map((s) => s.name)).toContain('doWork');
		expect(symbols.map((s) => s.name)).toContain('helper');
		expect(symbols.map((s) => s.name)).toContain('MyClass');
		expect(symbols.find((s) => s.name === 'MyClass')?.type).toBe('class');
	});

	it('stores import edges', () => {
		store.upsertFile(makeFile('src/a.ts', { imports: ['./b.js', './c.js'] }));
		expect(store.getDeps('src/a.ts')).toContain('./b.js');
		expect(store.getDeps('src/a.ts')).toContain('./c.js');
	});

	it('replaces nodes and edges on re-upsert', () => {
		store.upsertFile(makeFile('src/a.ts', { imports: ['./old.js'], functions: ['oldFn'] }));
		store.upsertFile(makeFile('src/a.ts', { imports: ['./new.js'], functions: ['newFn'] }));
		expect(store.getDeps('src/a.ts')).toEqual(['./new.js']);
		expect(store.getSymbols('src/a.ts').map((s) => s.name)).toEqual(['newFn']);
	});
});

describe('GraphStore — deleteFile', () => {
	it('removes nodes and edges', () => {
		store.upsertFile(makeFile('src/a.ts', { imports: ['./b.js'], functions: ['fn'] }));
		store.deleteFile('src/a.ts');
		expect(store.getDeps('src/a.ts')).toHaveLength(0);
		expect(store.getSymbols('src/a.ts')).toHaveLength(0);
	});
});

describe('GraphStore — getRefs', () => {
	it('returns files that import the given file', () => {
		store.upsertFile(makeFile('src/a.ts', { imports: ['src/b.ts'] }));
		store.upsertFile(makeFile('src/c.ts', { imports: ['src/b.ts'] }));
		const refs = store.getRefs('src/b.ts');
		expect(refs).toContain('src/a.ts');
		expect(refs).toContain('src/c.ts');
	});
});

describe('GraphStore — getAffected', () => {
	it('returns transitive dependents A→B→C: affected(A) includes B and C', () => {
		// A imports B, B imports C — so A is a dep of B and B is a dep of C
		// affected(C) = files that (transitively) import C
		store.upsertFile(makeFile('A.ts', { imports: ['B.ts'] }));
		store.upsertFile(makeFile('B.ts', { imports: ['C.ts'] }));
		store.upsertFile(makeFile('C.ts'));

		const affected = store.getAffected('C.ts');
		expect(affected).toContain('B.ts');
		expect(affected).toContain('A.ts');
	});

	it('respects maxDepth', () => {
		store.upsertFile(makeFile('A.ts', { imports: ['B.ts'] }));
		store.upsertFile(makeFile('B.ts', { imports: ['C.ts'] }));
		store.upsertFile(makeFile('C.ts', { imports: ['D.ts'] }));
		store.upsertFile(makeFile('D.ts'));

		// affected(D, maxDepth=1) should only return C, not B or A
		const affected = store.getAffected('D.ts', 1);
		expect(affected).toContain('C.ts');
		expect(affected).not.toContain('B.ts');
	});

	it('handles cycles without infinite loop', () => {
		store.upsertFile(makeFile('X.ts', { imports: ['Y.ts'] }));
		store.upsertFile(makeFile('Y.ts', { imports: ['X.ts'] }));
		const affected = store.getAffected('X.ts');
		expect(affected).toContain('Y.ts');
	});
});
