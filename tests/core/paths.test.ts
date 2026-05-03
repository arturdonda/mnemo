import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm, stat } from 'node:fs/promises';
import { vi } from 'vitest';

const PROJECT_ID = 'abc123def456789a';

describe('getPaths', () => {
	it('returns correct root path', async () => {
		const { getPaths } = await import('../../src/core/paths.js');
		const paths = getPaths(PROJECT_ID);
		expect(paths.root).toMatch(/\.xctx$/);
	});

	it('returns correct projectRoot', async () => {
		const { getPaths } = await import('../../src/core/paths.js');
		const paths = getPaths(PROJECT_ID);
		expect(paths.projectRoot).toContain(join('projects', PROJECT_ID));
	});

	it('returns correct featsDir', async () => {
		const { getPaths } = await import('../../src/core/paths.js');
		const paths = getPaths(PROJECT_ID);
		expect(paths.featsDir).toContain(join('projects', PROJECT_ID, 'feats'));
	});

	it('returns correct activeFeatFile', async () => {
		const { getPaths } = await import('../../src/core/paths.js');
		const paths = getPaths(PROJECT_ID);
		expect(paths.activeFeatFile).toContain('active_feat');
	});

	it('returns correct projectMeta', async () => {
		const { getPaths } = await import('../../src/core/paths.js');
		const paths = getPaths(PROJECT_ID);
		expect(paths.projectMeta).toContain('meta.json');
	});

	it('featDir returns path under featsDir', async () => {
		const { getPaths } = await import('../../src/core/paths.js');
		const paths = getPaths(PROJECT_ID);
		expect(paths.featDir('my-feat')).toContain(join('feats', 'my-feat'));
	});

	it('eventsFile returns events.jsonl under feat dir', async () => {
		const { getPaths } = await import('../../src/core/paths.js');
		const paths = getPaths(PROJECT_ID);
		expect(paths.eventsFile('my-feat')).toContain(join('my-feat', 'events.jsonl'));
	});

	it('contextFile returns context.md under feat dir', async () => {
		const { getPaths } = await import('../../src/core/paths.js');
		const paths = getPaths(PROJECT_ID);
		expect(paths.contextFile('my-feat')).toContain(join('my-feat', 'context.md'));
	});

	it('featMeta returns meta.json under feat dir', async () => {
		const { getPaths } = await import('../../src/core/paths.js');
		const paths = getPaths(PROJECT_ID);
		expect(paths.featMeta('my-feat')).toContain(join('my-feat', 'meta.json'));
	});
});

describe('ensurePaths', () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = join(tmpdir(), `xctx-test-${Date.now()}`);
		vi.spyOn(process, 'env', 'get').mockReturnValue({ ...process.env, HOME: tempDir, USERPROFILE: tempDir });
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await rm(tempDir, { recursive: true, force: true });
	});

	it('creates featsDir recursively', async () => {
		vi.resetModules();
		vi.doMock('node:os', () => ({ homedir: () => tempDir }));
		const { ensurePaths } = await import('../../src/core/paths.js');
		const paths = await ensurePaths(PROJECT_ID);
		const s = await stat(paths.featsDir);
		expect(s.isDirectory()).toBe(true);
	});

	it('creates featDir when featName provided', async () => {
		vi.resetModules();
		vi.doMock('node:os', () => ({ homedir: () => tempDir }));
		const { ensurePaths } = await import('../../src/core/paths.js');
		const paths = await ensurePaths(PROJECT_ID, 'my-feat');
		const s = await stat(paths.featDir('my-feat'));
		expect(s.isDirectory()).toBe(true);
	});

	it('is idempotent — does not throw if dirs already exist', async () => {
		vi.resetModules();
		vi.doMock('node:os', () => ({ homedir: () => tempDir }));
		const { ensurePaths } = await import('../../src/core/paths.js');
		await ensurePaths(PROJECT_ID);
		await expect(ensurePaths(PROJECT_ID)).resolves.toBeDefined();
	});
});
