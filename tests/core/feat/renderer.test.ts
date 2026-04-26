import { describe, it, expect } from 'vitest';
import { renderContext } from '../../../src/core/feat/renderer.js';
import type { FeatureContext } from '../../../src/core/feat/types.js';

function makeContext(overrides: Partial<FeatureContext> = {}): FeatureContext {
	return {
		meta: {
			id: 'payment-integration',
			name: 'payment-integration',
			branch: 'feature/payment-integration',
			status: 'in-progress',
			createdAt: new Date('2026-04-20').getTime(),
			updatedAt: new Date('2026-04-25').getTime(),
		},
		files: [],
		decisions: [],
		blockers: [],
		notes: [],
		...overrides,
	};
}

describe('renderContext', () => {
	it('renders header with feat name', () => {
		const md = renderContext(makeContext());
		expect(md).toContain('# FEAT: payment-integration');
	});

	it('renders branch when present', () => {
		const md = renderContext(makeContext());
		expect(md).toContain('**Branch:** feature/payment-integration');
	});

	it('omits branch when not present', () => {
		const ctx = makeContext();
		delete ctx.meta.branch;
		const md = renderContext(ctx);
		expect(md).not.toContain('**Branch:**');
	});

	it('renders status', () => {
		const md = renderContext(makeContext());
		expect(md).toContain('**Status:** in-progress');
	});

	it('renders files with reasons', () => {
		const ctx = makeContext({
			files: [
				{ path: 'src/routes/payments.ts', reason: 'main route handler' },
				{ path: 'src/services/stripe.ts' },
			],
		});
		const md = renderContext(ctx);
		expect(md).toContain('`src/routes/payments.ts` — main route handler');
		expect(md).toContain('`src/services/stripe.ts`');
	});

	it('renders empty files message', () => {
		const md = renderContext(makeContext());
		expect(md).toContain('_No files linked._');
	});

	it('renders decisions', () => {
		const ctx = makeContext({
			decisions: [{ text: 'Use Stripe Checkout', ts: new Date('2026-04-20').getTime(), author: 'claude' }],
		});
		const md = renderContext(ctx);
		expect(md).toContain('Use Stripe Checkout');
	});

	it('renders active blockers', () => {
		const ctx = makeContext({
			blockers: [{ text: 'Webhook failing', resolved: false, ts: Date.now() }],
		});
		const md = renderContext(ctx);
		expect(md).toContain('Webhook failing');
		expect(md).toContain('## Blockers');
	});

	it('renders None active when no blockers', () => {
		const md = renderContext(makeContext());
		expect(md).toContain('None active.');
	});

	it('renders resolved blockers in separate section', () => {
		const ctx = makeContext({
			blockers: [
				{ text: 'CI broken', resolved: true, ts: Date.now() },
			],
		});
		const md = renderContext(ctx);
		expect(md).toContain('## Resolved Blockers');
		expect(md).toContain('CI broken');
	});

	it('omits Resolved Blockers section when none', () => {
		const md = renderContext(makeContext());
		expect(md).not.toContain('## Resolved Blockers');
	});

	it('renders current status', () => {
		const ctx = makeContext({ currentStatus: 'Writing tests' });
		const md = renderContext(ctx);
		expect(md).toContain('Writing tests');
	});

	it('renders notes', () => {
		const ctx = makeContext({
			notes: [{ text: 'Check Stripe docs', ts: new Date('2026-04-23').getTime() }],
		});
		const md = renderContext(ctx);
		expect(md).toContain('## Notes');
		expect(md).toContain('Check Stripe docs');
	});

	it('omits Notes section when empty', () => {
		const md = renderContext(makeContext());
		expect(md).not.toContain('## Notes');
	});

	it('matches architecture example structure', () => {
		const ctx = makeContext({
			files: [
				{ path: 'src/routes/payments.ts', reason: 'main route handler' },
				{ path: 'src/services/stripe.ts' },
				{ path: 'src/models/order.ts' },
			],
			decisions: [
				{ text: 'Using Stripe Checkout, not Payment Intents — simpler for MVP scope', ts: new Date('2026-04-20').getTime() },
				{ text: 'Orders stay in PENDING until Stripe webhook confirms payment', ts: new Date('2026-04-22').getTime() },
				{ text: 'Webhook at /api/webhooks/stripe, verified via Stripe-Signature header', ts: new Date('2026-04-24').getTime() },
			],
			blockers: [],
			currentStatus: 'Webhook handler implemented, writing tests.',
			notes: [{ text: 'Stripe test mode uses different webhook secret than prod', ts: new Date('2026-04-23').getTime() }],
		});
		const md = renderContext(ctx);
		expect(md).toContain('## Relevant Files');
		expect(md).toContain('## Decisions');
		expect(md).toContain('## Current Status');
		expect(md).toContain('## Blockers');
		expect(md).toContain('## Notes');
	});
});
