import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm, mkdir, writeFile } from 'node:fs/promises';
import type { FeatureEvent, FeatureMeta } from '../../../src/core/feat/types.js';

const PROJECT_ID = 'test0000deadbeef';
const FEAT = 'my-feat';

function makeMeta(overrides: Partial<FeatureMeta> = {}): FeatureMeta {
	return {
		id: FEAT,
		name: FEAT,
		status: 'in-progress',
		createdAt: 1000000,
		updatedAt: 1000000,
		...overrides,
	};
}

describe('buildContext', () => {
	it('starts with empty state', async () => {
		const { buildContext } = await import('../../../src/core/feat/store.js');
		const ctx = buildContext([], makeMeta());
		expect(ctx.files).toEqual([]);
		expect(ctx.decisions).toEqual([]);
		expect(ctx.blockers).toEqual([]);
		expect(ctx.notes).toEqual([]);
		expect(ctx.currentStatus).toBeUndefined();
	});

	it('links and unlinks files', async () => {
		const { buildContext } = await import('../../../src/core/feat/store.js');
		const events: FeatureEvent[] = [
			{ ts: 1, type: 'file_linked', path: 'src/a.ts', reason: 'main' },
			{ ts: 2, type: 'file_linked', path: 'src/b.ts' },
			{ ts: 3, type: 'file_unlinked', path: 'src/a.ts' },
		];
		const ctx = buildContext(events, makeMeta());
		expect(ctx.files).toHaveLength(1);
		expect(ctx.files[0].path).toBe('src/b.ts');
	});

	it('records decisions', async () => {
		const { buildContext } = await import('../../../src/core/feat/store.js');
		const events: FeatureEvent[] = [
			{ ts: 1, type: 'decision', text: 'Use Stripe', author: 'user' },
		];
		const ctx = buildContext(events, makeMeta());
		expect(ctx.decisions).toHaveLength(1);
		expect(ctx.decisions[0].text).toBe('Use Stripe');
	});

	it('records and resolves blockers', async () => {
		const { buildContext } = await import('../../../src/core/feat/store.js');
		const events: FeatureEvent[] = [
			{ ts: 1, type: 'blocker', text: 'Webhook failing in test env' },
			{ ts: 2, type: 'blocker_resolved', text: 'Webhook failing' },
		];
		const ctx = buildContext(events, makeMeta());
		expect(ctx.blockers[0].resolved).toBe(true);
	});

	it('sets status to blocked when active blocker exists', async () => {
		const { buildContext } = await import('../../../src/core/feat/store.js');
		const events: FeatureEvent[] = [{ ts: 1, type: 'blocker', text: 'CI broken' }];
		const ctx = buildContext(events, makeMeta({ status: 'in-progress' }));
		expect(ctx.meta.status).toBe('blocked');
	});

	it('reverts status to in-progress when all blockers resolved', async () => {
		const { buildContext } = await import('../../../src/core/feat/store.js');
		const events: FeatureEvent[] = [
			{ ts: 1, type: 'blocker', text: 'CI broken' },
			{ ts: 2, type: 'blocker_resolved', text: 'CI broken' },
		];
		const ctx = buildContext(events, makeMeta({ status: 'blocked' }));
		expect(ctx.meta.status).toBe('in-progress');
	});

	it('sets status to done on feat_done', async () => {
		const { buildContext } = await import('../../../src/core/feat/store.js');
		const events: FeatureEvent[] = [{ ts: 1, type: 'feat_done' }];
		const ctx = buildContext(events, makeMeta());
		expect(ctx.meta.status).toBe('done');
	});

	it('tracks current status text', async () => {
		const { buildContext } = await import('../../../src/core/feat/store.js');
		const events: FeatureEvent[] = [
			{ ts: 1, type: 'status', text: 'Implementing webhook' },
			{ ts: 2, type: 'status', text: 'Writing tests' },
		];
		const ctx = buildContext(events, makeMeta());
		expect(ctx.currentStatus).toBe('Writing tests');
	});

	it('records notes', async () => {
		const { buildContext } = await import('../../../src/core/feat/store.js');
		const events: FeatureEvent[] = [{ ts: 1, type: 'note', text: 'Check Stripe docs' }];
		const ctx = buildContext(events, makeMeta());
		expect(ctx.notes[0].text).toBe('Check Stripe docs');
	});
});

describe('readEvents / appendEvent / featExists / listFeats', () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = join(tmpdir(), `mnemo-store-${Date.now()}`);
		await mkdir(tempDir, { recursive: true });
		vi.resetModules();
		vi.doMock('node:os', () => ({ homedir: () => tempDir }));
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await rm(tempDir, { recursive: true, force: true });
	});

	async function setup() {
		const { getPaths, ensurePaths } = await import('../../../src/core/paths.js');
		const paths = getPaths(PROJECT_ID);
		await ensurePaths(PROJECT_ID, FEAT);
		const meta = makeMeta();
		await writeFile(paths.featMeta(FEAT), JSON.stringify(meta), 'utf-8');
		return { paths, meta };
	}

	it('readEvents returns empty array for missing file', async () => {
		await setup();
		const { readEvents } = await import('../../../src/core/feat/store.js');
		const events = await readEvents(PROJECT_ID, 'nonexistent');
		expect(events).toEqual([]);
	});

	it('appendEvent writes event and regenerates context.md', async () => {
		const { paths } = await setup();
		const { appendEvent, readEvents } = await import('../../../src/core/feat/store.js');
		const event: FeatureEvent = { ts: 1, type: 'decision', text: 'Use Stripe', author: 'user' };
		await appendEvent(PROJECT_ID, FEAT, event);

		const events = await readEvents(PROJECT_ID, FEAT);
		expect(events).toHaveLength(1);
		expect(events[0].text).toBe('Use Stripe');

		const { readFile } = await import('node:fs/promises');
		const md = await readFile(paths.contextFile(FEAT), 'utf-8');
		expect(md).toContain('Use Stripe');
	});

	it('featExists returns false for unknown feat', async () => {
		await setup();
		const { featExists } = await import('../../../src/core/feat/store.js');
		expect(featExists(PROJECT_ID, 'unknown')).toBe(false);
	});

	it('featExists returns true for existing feat', async () => {
		await setup();
		const { featExists } = await import('../../../src/core/feat/store.js');
		expect(featExists(PROJECT_ID, FEAT)).toBe(true);
	});

	it('listFeats returns all feats', async () => {
		await setup();
		const { getPaths, ensurePaths } = await import('../../../src/core/paths.js');
		const paths = getPaths(PROJECT_ID);
		await ensurePaths(PROJECT_ID, 'other-feat');
		await writeFile(paths.featMeta('other-feat'), JSON.stringify(makeMeta({ id: 'other-feat', name: 'other-feat' })), 'utf-8');

		const { listFeats } = await import('../../../src/core/feat/store.js');
		const feats = await listFeats(PROJECT_ID);
		expect(feats.map((f) => f.name).sort()).toEqual([FEAT, 'other-feat'].sort());
	});
});
