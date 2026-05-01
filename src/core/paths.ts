import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';

export type MnemoPaths = {
	root: string;
	projectRoot: string;
	featsDir: string;
	activeFeatFile: string;
	projectMeta: string;
	indexDb: string;
	graphDb: string;
	projectMemoryFile: string;
	featDir: (name: string) => string;
	eventsFile: (name: string) => string;
	contextFile: (name: string) => string;
	featMeta: (name: string) => string;
};

export function getPaths(projectId: string): MnemoPaths {
	const root = join(homedir(), '.mnemo');
	const projectRoot = join(root, 'projects', projectId);
	const featsDir = join(projectRoot, 'feats');

	return {
		root,
		projectRoot,
		featsDir,
		activeFeatFile: join(projectRoot, 'active_feat'),
		projectMeta: join(projectRoot, 'meta.json'),
		indexDb: join(projectRoot, 'index.db'),
		graphDb: join(projectRoot, 'graph.db'),
		projectMemoryFile: join(projectRoot, 'memory.jsonl'),
		featDir: (name) => join(featsDir, name),
		eventsFile: (name) => join(featsDir, name, 'events.jsonl'),
		contextFile: (name) => join(featsDir, name, 'context.md'),
		featMeta: (name) => join(featsDir, name, 'meta.json'),
	};
}

export function getUserMemoryPath(): string {
	return join(homedir(), '.mnemo', 'memory.jsonl');
}

export async function ensurePaths(projectId: string, featName?: string): Promise<MnemoPaths> {
	const paths = getPaths(projectId);

	await mkdir(paths.featsDir, { recursive: true });

	if (featName) {
		await mkdir(paths.featDir(featName), { recursive: true });
	}

	return paths;
}
