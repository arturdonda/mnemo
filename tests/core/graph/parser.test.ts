import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm, mkdir, writeFile } from 'node:fs/promises';
import { parseFile } from '../../../src/core/graph/parser.js';

let tempDir: string;

beforeAll(async () => {
	tempDir = join(tmpdir(), `mnemo-parser-${Date.now()}`);
	await mkdir(tempDir, { recursive: true });
});

afterAll(async () => {
	await rm(tempDir, { recursive: true, force: true });
});

describe('parseFile — TypeScript', () => {
	it('extracts imports', async () => {
		const file = join(tempDir, 'a.ts');
		await writeFile(file, `
import { foo } from './foo.js';
import type { Bar } from './bar.js';
import * as baz from 'baz';
`, 'utf-8');
		const result = await parseFile(file);
		expect(result.imports).toContain('./foo.js');
		expect(result.imports).toContain('./bar.js');
		expect(result.imports).toContain('baz');
	});

	it('extracts exported functions and classes', async () => {
		const file = join(tempDir, 'b.ts');
		await writeFile(file, `
export function doSomething() {}
export async function fetchData() {}
export class MyService {}
export const helper = () => {};
`, 'utf-8');
		const result = await parseFile(file);
		expect(result.functions).toContain('doSomething');
		expect(result.classes).toContain('MyService');
	});

	it('extracts top-level functions', async () => {
		const file = join(tempDir, 'c.ts');
		await writeFile(file, `
function internalHelper() {}
async function asyncThing() {}
const arrowFn = () => {};
`, 'utf-8');
		const result = await parseFile(file);
		expect(result.functions).toContain('internalHelper');
		expect(result.functions).toContain('asyncThing');
		expect(result.functions).toContain('arrowFn');
	});
});

describe('parseFile — Python', () => {
	it('extracts imports and functions', async () => {
		const file = join(tempDir, 'a.py');
		await writeFile(file, `
import os
from pathlib import Path

def main():
    pass

class MyClass:
    pass
`, 'utf-8');
		const result = await parseFile(file);
		expect(result.imports.length).toBeGreaterThan(0);
		expect(result.functions).toContain('main');
		expect(result.classes).toContain('MyClass');
	});
});

describe('parseFile — Go', () => {
	it('extracts functions', async () => {
		const file = join(tempDir, 'main.go');
		await writeFile(file, `
package main

import "fmt"

func main() {
    fmt.Println("hello")
}

func helper(x int) int {
    return x
}
`, 'utf-8');
		const result = await parseFile(file);
		expect(result.functions).toContain('main');
		expect(result.functions).toContain('helper');
	});
});

describe('parseFile — unknown extension (fallback)', () => {
	it('extracts import-like lines', async () => {
		const file = join(tempDir, 'script.sh');
		await writeFile(file, `
#!/bin/bash
source "utils.sh"
import something
`, 'utf-8');
		const result = await parseFile(file);
		expect(result.imports.length).toBeGreaterThanOrEqual(1);
		expect(result.functions).toHaveLength(0);
	});
});

describe('parseFile — self-parsing', () => {
	it('can parse its own source file', async () => {
		const result = await parseFile('src/core/graph/parser.ts');
		expect(result.imports.length).toBeGreaterThan(0);
		expect(result.functions.length).toBeGreaterThan(0);
		expect(result.filePath).toBe('src/core/graph/parser.ts');
	});
});
