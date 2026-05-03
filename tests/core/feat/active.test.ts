import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm, mkdir } from 'node:fs/promises';

const PROJECT_ID = 'test0000deadbeef';

describe('active feat', () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = join(tmpdir(), `xctx-active-${Date.now()}`);
		await mkdir(tempDir, { recursive: true });
		vi.resetModules();
		vi.doMock('node:os', () => ({ homedir: () => tempDir }));
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await rm(tempDir, { recursive: true, force: true });
	});

	async function setup() {
		const { ensurePaths } = await import('../../../src/core/paths.js');
		await ensurePaths(PROJECT_ID);
	}

	it('getActiveFeat returns null when no active feat file', async () => {
		await setup();
		const { getActiveFeat } = await import('../../../src/core/feat/active.js');
		expect(await getActiveFeat(PROJECT_ID)).toBeNull();
	});

	it('setActiveFeat writes the feat name', async () => {
		await setup();
		const { setActiveFeat, getActiveFeat } = await import('../../../src/core/feat/active.js');
		await setActiveFeat(PROJECT_ID, 'payment-flow');
		expect(await getActiveFeat(PROJECT_ID)).toBe('payment-flow');
	});

	it('setActiveFeat overwrites previous active feat', async () => {
		await setup();
		const { setActiveFeat, getActiveFeat } = await import('../../../src/core/feat/active.js');
		await setActiveFeat(PROJECT_ID, 'feat-a');
		await setActiveFeat(PROJECT_ID, 'feat-b');
		expect(await getActiveFeat(PROJECT_ID)).toBe('feat-b');
	});

	it('clearActiveFeat removes the file', async () => {
		await setup();
		const { setActiveFeat, clearActiveFeat, getActiveFeat } = await import('../../../src/core/feat/active.js');
		await setActiveFeat(PROJECT_ID, 'payment-flow');
		await clearActiveFeat(PROJECT_ID);
		expect(await getActiveFeat(PROJECT_ID)).toBeNull();
	});

	it('clearActiveFeat is a no-op when no active feat', async () => {
		await setup();
		const { clearActiveFeat } = await import('../../../src/core/feat/active.js');
		await expect(clearActiveFeat(PROJECT_ID)).resolves.toBeUndefined();
	});
});
