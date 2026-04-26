import { readFile, writeFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { getPaths } from '../paths.js';

export async function getActiveFeat(projectId: string): Promise<string | null> {
	const paths = getPaths(projectId);
	if (!existsSync(paths.activeFeatFile)) return null;
	const name = (await readFile(paths.activeFeatFile, 'utf-8')).trim();
	return name || null;
}

export async function setActiveFeat(projectId: string, featName: string): Promise<void> {
	const paths = getPaths(projectId);
	await writeFile(paths.activeFeatFile, featName, 'utf-8');
}

export async function clearActiveFeat(projectId: string): Promise<void> {
	const paths = getPaths(projectId);
	if (existsSync(paths.activeFeatFile)) {
		await unlink(paths.activeFeatFile);
	}
}
