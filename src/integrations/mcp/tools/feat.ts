import { z } from 'zod';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { resolveProjectId } from '../../../core/project.js';
import { getPaths } from '../../../core/paths.js';
import { appendEvent, readEvents, buildContext } from '../../../core/feat/store.js';
import { getActiveFeat } from '../../../core/feat/active.js';
import { renderContext } from '../../../core/feat/renderer.js';
import type { FeatureMeta } from '../../../core/feat/types.js';

async function getProjectId(): Promise<string> {
	return resolveProjectId(process.cwd());
}

async function resolveActiveFeatName(projectId: string, featName?: string): Promise<string> {
	const name = featName ?? (await getActiveFeat(projectId));
	if (!name) throw new Error('No active feature. Start one with `xctx feat start <name>`.');
	return name;
}

async function readFeatContext(projectId: string, featName: string): Promise<string> {
	const paths = getPaths(projectId);
	if (existsSync(paths.contextFile(featName))) {
		return readFile(paths.contextFile(featName), 'utf-8');
	}
	const events = await readEvents(projectId, featName);
	const metaRaw = await readFile(paths.featMeta(featName), 'utf-8');
	const meta = JSON.parse(metaRaw) as FeatureMeta;
	const ctx = buildContext(events, meta);
	return renderContext(ctx);
}

export function registerFeatTools(server: McpServer): void {
	server.tool('get_feat_context', 'Get the current feature context (decisions, files, blockers, notes)', {
		feat: z.string().optional().describe('Feature name; defaults to active feature'),
	}, async ({ feat }) => {
		const projectId = await getProjectId();
		const featName = await resolveActiveFeatName(projectId, feat);
		const content = await readFeatContext(projectId, featName);
		return { content: [{ type: 'text' as const, text: content }] };
	});

	server.tool('record_decision', 'Record an architectural decision for the active feature', {
		text: z.string().describe('Decision text'),
		feat: z.string().optional().describe('Feature name; defaults to active feature'),
	}, async ({ text, feat }) => {
		const projectId = await getProjectId();
		const featName = await resolveActiveFeatName(projectId, feat);
		await appendEvent(projectId, featName, { ts: Date.now(), type: 'decision', text, author: 'agent' });
		return { content: [{ type: 'text' as const, text: `Decision recorded: ${text.slice(0, 80)}` }] };
	});

	server.tool('record_blocker', 'Record a blocker for the active feature', {
		text: z.string().describe('Blocker description'),
		feat: z.string().optional().describe('Feature name; defaults to active feature'),
	}, async ({ text, feat }) => {
		const projectId = await getProjectId();
		const featName = await resolveActiveFeatName(projectId, feat);
		await appendEvent(projectId, featName, { ts: Date.now(), type: 'blocker', text });
		return { content: [{ type: 'text' as const, text: `Blocker recorded: ${text.slice(0, 80)}` }] };
	});

	server.tool('resolve_blocker', 'Resolve a blocker by substring match', {
		text: z.string().describe('Substring matching the blocker to resolve'),
		feat: z.string().optional().describe('Feature name; defaults to active feature'),
	}, async ({ text, feat }) => {
		const projectId = await getProjectId();
		const featName = await resolveActiveFeatName(projectId, feat);
		const events = await readEvents(projectId, featName);
		const paths = getPaths(projectId);
		const metaRaw = await readFile(paths.featMeta(featName), 'utf-8');
		const meta = JSON.parse(metaRaw) as FeatureMeta;
		const ctx = buildContext(events, meta);
		const match = ctx.blockers.find((b) => !b.resolved && b.text.toLowerCase().includes(text.toLowerCase()));
		if (!match) throw new Error(`No active blocker matching "${text}".`);
		await appendEvent(projectId, featName, { ts: Date.now(), type: 'blocker_resolved', text });
		return { content: [{ type: 'text' as const, text: `Blocker resolved: ${match.text.slice(0, 80)}` }] };
	});

	server.tool('link_file', 'Link a file to the active feature context', {
		path: z.string().describe('File path to link'),
		reason: z.string().optional().describe('Why this file is relevant'),
		feat: z.string().optional().describe('Feature name; defaults to active feature'),
	}, async ({ path, reason, feat }) => {
		const projectId = await getProjectId();
		const featName = await resolveActiveFeatName(projectId, feat);
		await appendEvent(projectId, featName, { ts: Date.now(), type: 'file_linked', path, reason });
		return { content: [{ type: 'text' as const, text: `File linked: ${path}` }] };
	});
}
