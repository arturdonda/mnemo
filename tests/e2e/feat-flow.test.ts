import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm, mkdir, readFile } from 'node:fs/promises';

const PROJECT_ID = 'e2e0000cafebabe0';
const FEAT = 'payment-flow';

describe('full FEAT flow (e2e)', () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = join(tmpdir(), `mnemo-e2e-${Date.now()}`);
		await mkdir(tempDir, { recursive: true });
		vi.resetModules();
		vi.doMock('node:os', () => ({ homedir: () => tempDir }));
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await rm(tempDir, { recursive: true, force: true });
	});

	async function setup() {
		const { ensurePaths, getPaths } = await import('../../src/core/paths.js');
		const paths = await ensurePaths(PROJECT_ID);
		const { writeFile } = await import('node:fs/promises');
		await writeFile(
			paths.projectMeta,
			JSON.stringify({ id: PROJECT_ID, name: 'test-project', path: tempDir, createdAt: Date.now() }),
			'utf-8',
		);
		return { paths };
	}

	it('init → feat start → decision → blocker → resolve → context', async () => {
		const { paths } = await setup();
		const { ensurePaths: ep, getPaths: gp } = await import('../../src/core/paths.js');
		const { appendEvent, readEvents, buildContext } = await import('../../src/core/feat/store.js');
		const { getActiveFeat, setActiveFeat } = await import('../../src/core/feat/active.js');
		const { renderContext } = await import('../../src/core/feat/renderer.js');
		const { writeFile } = await import('node:fs/promises');

		// feat start
		const featPaths = await ep(PROJECT_ID, FEAT);
		const now = Date.now();
		const meta = {
			id: FEAT,
			name: FEAT,
			status: 'in-progress' as const,
			createdAt: now,
			updatedAt: now,
		};
		await writeFile(featPaths.featMeta(FEAT), JSON.stringify(meta, null, 2), 'utf-8');
		await appendEvent(PROJECT_ID, FEAT, { ts: now, type: 'feat_created', text: FEAT });
		await setActiveFeat(PROJECT_ID, FEAT);

		expect(await getActiveFeat(PROJECT_ID)).toBe(FEAT);

		// decision
		await appendEvent(PROJECT_ID, FEAT, { ts: now + 1, type: 'decision', text: 'Use Stripe Checkout', author: 'user' });

		// blocker
		await appendEvent(PROJECT_ID, FEAT, { ts: now + 2, type: 'blocker', text: 'Webhook failing in test env' });

		// resolve blocker
		await appendEvent(PROJECT_ID, FEAT, { ts: now + 3, type: 'blocker_resolved', text: 'Webhook failing' });

		// context
		const events = await readEvents(PROJECT_ID, FEAT);
		const ctx = buildContext(events, meta);

		expect(ctx.decisions).toHaveLength(1);
		expect(ctx.decisions[0].text).toBe('Use Stripe Checkout');
		expect(ctx.blockers).toHaveLength(1);
		expect(ctx.blockers[0].resolved).toBe(true);
		expect(ctx.meta.status).toBe('in-progress');

		const md = renderContext(ctx);
		expect(md).toContain('# FEAT: payment-flow');
		expect(md).toContain('Use Stripe Checkout');
		expect(md).toContain('## Resolved Blockers');
		expect(md).toContain('None active.');
	});

	it('file link → unlink flow', async () => {
		await setup();
		const { ensurePaths: ep } = await import('../../src/core/paths.js');
		const { appendEvent, readEvents, buildContext } = await import('../../src/core/feat/store.js');
		const { writeFile } = await import('node:fs/promises');

		await ep(PROJECT_ID, FEAT);
		const now = Date.now();
		const meta = { id: FEAT, name: FEAT, status: 'in-progress' as const, createdAt: now, updatedAt: now };
		const paths = (await import('../../src/core/paths.js')).getPaths(PROJECT_ID);
		await writeFile(paths.featMeta(FEAT), JSON.stringify(meta), 'utf-8');

		await appendEvent(PROJECT_ID, FEAT, { ts: now, type: 'feat_created', text: FEAT });
		await appendEvent(PROJECT_ID, FEAT, { ts: now + 1, type: 'file_linked', path: 'src/payments.ts', reason: 'main handler' });
		await appendEvent(PROJECT_ID, FEAT, { ts: now + 2, type: 'file_linked', path: 'src/stripe.ts' });
		await appendEvent(PROJECT_ID, FEAT, { ts: now + 3, type: 'file_unlinked', path: 'src/payments.ts' });

		const events = await readEvents(PROJECT_ID, FEAT);
		const ctx = buildContext(events, meta);

		expect(ctx.files).toHaveLength(1);
		expect(ctx.files[0].path).toBe('src/stripe.ts');
	});

	it('feat done clears active feat', async () => {
		await setup();
		const { ensurePaths: ep } = await import('../../src/core/paths.js');
		const { appendEvent } = await import('../../src/core/feat/store.js');
		const { setActiveFeat, clearActiveFeat, getActiveFeat } = await import('../../src/core/feat/active.js');
		const { writeFile } = await import('node:fs/promises');

		await ep(PROJECT_ID, FEAT);
		const now = Date.now();
		const meta = { id: FEAT, name: FEAT, status: 'in-progress' as const, createdAt: now, updatedAt: now };
		const paths = (await import('../../src/core/paths.js')).getPaths(PROJECT_ID);
		await writeFile(paths.featMeta(FEAT), JSON.stringify(meta), 'utf-8');

		await appendEvent(PROJECT_ID, FEAT, { ts: now, type: 'feat_created', text: FEAT });
		await setActiveFeat(PROJECT_ID, FEAT);
		await appendEvent(PROJECT_ID, FEAT, { ts: now + 1, type: 'feat_done' });

		const active = await getActiveFeat(PROJECT_ID);
		if (active === FEAT) await clearActiveFeat(PROJECT_ID);

		expect(await getActiveFeat(PROJECT_ID)).toBeNull();
	});

	it('context.md is regenerated on every append', async () => {
		await setup();
		const { ensurePaths: ep, getPaths: gp } = await import('../../src/core/paths.js');
		const { appendEvent } = await import('../../src/core/feat/store.js');
		const { writeFile } = await import('node:fs/promises');

		await ep(PROJECT_ID, FEAT);
		const now = Date.now();
		const meta = { id: FEAT, name: FEAT, status: 'in-progress' as const, createdAt: now, updatedAt: now };
		const paths = gp(PROJECT_ID);
		await writeFile(paths.featMeta(FEAT), JSON.stringify(meta), 'utf-8');

		await appendEvent(PROJECT_ID, FEAT, { ts: now, type: 'feat_created', text: FEAT });
		await appendEvent(PROJECT_ID, FEAT, { ts: now + 1, type: 'decision', text: 'Use ESM' });
		await appendEvent(PROJECT_ID, FEAT, { ts: now + 2, type: 'note', text: 'Check docs' });

		const md = await readFile(paths.contextFile(FEAT), 'utf-8');
		expect(md).toContain('Use ESM');
		expect(md).toContain('Check docs');
	});
});
