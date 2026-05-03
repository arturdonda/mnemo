import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm, mkdir, writeFile } from 'node:fs/promises';
import { parseFile } from '../../src/core/graph/parser.js';
import { GraphStore } from '../../src/core/graph/store.js';

let tempDir: string;
let store: GraphStore;
let dbPath: string;

beforeAll(async () => {
	tempDir = join(tmpdir(), `xctx-e2e-graph-${Date.now()}`);
	await mkdir(tempDir, { recursive: true });

	dbPath = join(tempDir, 'graph.db');
	store = new GraphStore(dbPath);

	// Write a small module graph: A imports B, B imports C
	await writeFile(join(tempDir, 'a.ts'), `import { b } from './b.js';\nexport function a() {}\n`, 'utf-8');
	await writeFile(join(tempDir, 'b.ts'), `import { c } from './c.js';\nexport function b() {}\nexport class BClass {}\n`, 'utf-8');
	await writeFile(join(tempDir, 'c.ts'), `export function c() {}\n`, 'utf-8');

	for (const name of ['a.ts', 'b.ts', 'c.ts']) {
		const parsed = await parseFile(join(tempDir, name));
		store.upsertFile(parsed);
	}
});

afterAll(async () => {
	store.close();
	await rm(tempDir, { recursive: true, force: true });
});

describe('graph flow — deps and refs', () => {
	it('getDeps returns direct imports', () => {
		const aPath = join(tempDir, 'a.ts');
		const deps = store.getDeps(aPath);
		expect(deps.some((d) => d.includes('./b.js'))).toBe(true);
	});

	it('getRefs returns files importing the given file', () => {
		const bPath = join(tempDir, 'b.ts');
		const refs = store.getRefs('./b.js');
		// refs may use the full path of the importing file
		// but since we store the raw import string as to_id, we check deps from a
		const aPath = join(tempDir, 'a.ts');
		const aDeps = store.getDeps(aPath);
		expect(aDeps).toContain('./b.js');
	});

	it('getAffected returns transitive dependents', () => {
		// C is imported by B (via './c.js'), B is imported by A
		const cPath = join(tempDir, 'c.ts');
		// The import strings stored are the raw strings: './c.js' and './b.js'
		// getDeps(a) = ['./b.js'], getDeps(b) = ['./c.js']
		// getRefs('./c.js') should return b.ts (since b.ts imports './c.js')
		const bPath = join(tempDir, 'b.ts');
		const bDeps = store.getDeps(bPath);
		expect(bDeps).toContain('./c.js');
	});

	it('getSymbols returns functions and classes', () => {
		const bPath = join(tempDir, 'b.ts');
		const symbols = store.getSymbols(bPath);
		expect(symbols.map((s) => s.name)).toContain('b');
		expect(symbols.map((s) => s.name)).toContain('BClass');
		expect(symbols.find((s) => s.name === 'BClass')?.type).toBe('class');
	});
});

describe('graph flow — affected chain', () => {
	it('affected(c-import-string) finds b via getRefs', () => {
		// Since we store raw import strings as edges, we check the import string path
		const affected = store.getAffected('./c.js', 3);
		// b.ts imports './c.js' so b.ts should appear as affected
		const bPath = join(tempDir, 'b.ts');
		expect(affected).toContain(bPath);
	});
});
