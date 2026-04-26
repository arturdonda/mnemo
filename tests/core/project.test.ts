import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm, mkdir, writeFile } from 'node:fs/promises';

describe('resolveProjectId', () => {
	it('returns a 16-char hex string', async () => {
		const { resolveProjectId } = await import('../../src/core/project.js');
		const id = await resolveProjectId(process.cwd());
		expect(id).toMatch(/^[0-9a-f]{16}$/);
	});

	it('returns the same id for the same input', async () => {
		const { resolveProjectId } = await import('../../src/core/project.js');
		const id1 = await resolveProjectId(process.cwd());
		const id2 = await resolveProjectId(process.cwd());
		expect(id1).toBe(id2);
	});

	it('returns different ids for different directories without a remote', async () => {
		vi.resetModules();
		vi.doMock('simple-git', () => ({
			default: () => ({
				getRemotes: async () => [],
			}),
		}));
		const { resolveProjectId } = await import('../../src/core/project.js');
		const id1 = await resolveProjectId('/tmp/proj-a');
		const id2 = await resolveProjectId('/tmp/proj-b');
		expect(id1).not.toBe(id2);
		vi.restoreAllMocks();
	});
});

describe('resolveProjectName', () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = join(tmpdir(), `mnemo-proj-${Date.now()}`);
		await mkdir(tempDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	it('returns package.json name when available', async () => {
		vi.resetModules();
		await writeFile(join(tempDir, 'package.json'), JSON.stringify({ name: 'my-project' }));
		const { resolveProjectName } = await import('../../src/core/project.js');
		const name = await resolveProjectName(tempDir);
		expect(name).toBe('my-project');
	});

	it('falls back to directory name when no package.json', async () => {
		vi.resetModules();
		const { resolveProjectName } = await import('../../src/core/project.js');
		const name = await resolveProjectName(tempDir);
		expect(name).toBe(tempDir.split(/[\\/]/).pop());
	});
});

describe('assertInitialized', () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = join(tmpdir(), `mnemo-assert-${Date.now()}`);
		await mkdir(tempDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
		vi.restoreAllMocks();
	});

	it('throws MnemoError if meta.json does not exist', async () => {
		vi.resetModules();
		vi.doMock('node:os', () => ({ homedir: () => tempDir }));
		const { assertInitialized } = await import('../../src/core/project.js');
		await expect(assertInitialized('nonexistent-id')).rejects.toThrow('mnemo init');
	});

	it('resolves if meta.json exists', async () => {
		vi.resetModules();
		vi.doMock('node:os', () => ({ homedir: () => tempDir }));
		const { getPaths } = await import('../../src/core/paths.js');
		const { assertInitialized } = await import('../../src/core/project.js');
		const paths = getPaths('test-id');
		await mkdir(paths.projectRoot, { recursive: true });
		await writeFile(paths.projectMeta, JSON.stringify({ name: 'test' }));
		await expect(assertInitialized('test-id')).resolves.toBeUndefined();
	});
});
