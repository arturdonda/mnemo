import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import type { FeatureContext, FeatureEvent, FeatureMeta } from './types.js';
import { ensurePaths, getPaths } from '../paths.js';
import { renderContext } from './renderer.js';

export async function appendEvent(
	projectId: string,
	featName: string,
	event: FeatureEvent,
): Promise<void> {
	const paths = await ensurePaths(projectId, featName);
	const line = JSON.stringify(event) + '\n';
	await writeFile(paths.eventsFile(featName), line, { flag: 'a' });

	const events = await readEvents(projectId, featName);
	const meta = await readFeatMeta(projectId, featName);
	const context = buildContext(events, meta);
	await writeFile(paths.contextFile(featName), renderContext(context), 'utf-8');
}

export async function readEvents(projectId: string, featName: string): Promise<FeatureEvent[]> {
	const paths = getPaths(projectId);
	const file = paths.eventsFile(featName);
	if (!existsSync(file)) return [];

	const raw = await readFile(file, 'utf-8');
	return raw
		.split('\n')
		.filter(Boolean)
		.map((line) => JSON.parse(line) as FeatureEvent);
}

export function buildContext(events: FeatureEvent[], meta: FeatureMeta): FeatureContext {
	const files = new Map<string, { path: string; reason?: string }>();
	const decisions: FeatureContext['decisions'] = [];
	const blockers: FeatureContext['blockers'] = [];
	const notes: FeatureContext['notes'] = [];
	let currentStatus: string | undefined;
	let status: FeatureMeta['status'] = meta.status;

	for (const event of events) {
		switch (event.type) {
			case 'file_linked':
				if (event.path) {
					files.set(event.path, { path: event.path, reason: event.reason });
				}
				break;

			case 'file_unlinked':
				if (event.path) files.delete(event.path);
				break;

			case 'decision':
				if (event.text) {
					decisions.push({ text: event.text, ts: event.ts, author: event.author });
				}
				break;

			case 'blocker':
				if (event.text) {
					blockers.push({ text: event.text, resolved: false, ts: event.ts });
				}
				break;

			case 'blocker_resolved':
				if (event.text) {
					const needle = event.text.toLowerCase();
					for (let i = blockers.length - 1; i >= 0; i--) {
						if (!blockers[i].resolved && blockers[i].text.toLowerCase().includes(needle)) {
							blockers[i].resolved = true;
							break;
						}
					}
				}
				break;

			case 'status':
				if (event.text) currentStatus = event.text;
				break;

			case 'note':
				if (event.text) {
					notes.push({ text: event.text, ts: event.ts });
				}
				break;

			case 'feat_done':
				status = 'done';
				break;
		}
	}

	const hasActiveBlocker = blockers.some((b) => !b.resolved);
	if (hasActiveBlocker && status === 'in-progress') status = 'blocked';
	if (!hasActiveBlocker && status === 'blocked') status = 'in-progress';

	return {
		meta: { ...meta, status },
		files: Array.from(files.values()),
		decisions,
		blockers,
		notes,
		currentStatus,
	};
}

async function readFeatMeta(projectId: string, featName: string): Promise<FeatureMeta> {
	const paths = getPaths(projectId);
	const raw = await readFile(paths.featMeta(featName), 'utf-8');
	return JSON.parse(raw) as FeatureMeta;
}

export async function listFeats(projectId: string): Promise<FeatureMeta[]> {
	const paths = getPaths(projectId);
	if (!existsSync(paths.featsDir)) return [];

	const entries = await readdir(paths.featsDir, { withFileTypes: true });
	const metas: FeatureMeta[] = [];

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		const metaFile = paths.featMeta(entry.name);
		if (!existsSync(metaFile)) continue;
		const raw = await readFile(metaFile, 'utf-8');
		metas.push(JSON.parse(raw) as FeatureMeta);
	}

	return metas;
}

export function featExists(projectId: string, featName: string): boolean {
	const paths = getPaths(projectId);
	return existsSync(paths.featMeta(featName));
}
