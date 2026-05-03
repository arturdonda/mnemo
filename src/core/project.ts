import { xxh3 } from '@node-rs/xxhash';
import { readFile, realpath } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { simpleGit } from 'simple-git';
import { XctxError } from './error.js';
import { getPaths } from './paths.js';
import { existsSync } from 'node:fs';

async function getGitRemote(cwd: string): Promise<string | null> {
	try {
		const git = simpleGit(cwd);
		const remotes = await git.getRemotes(true);
		const origin = remotes.find((r: { name: string }) => r.name === 'origin') ?? remotes[0];
		return (origin as { refs?: { fetch?: string } } | undefined)?.refs?.fetch ?? null;
	} catch {
		return null;
	}
}

async function getPackageName(cwd: string): Promise<string | null> {
	try {
		const raw = await readFile(join(cwd, 'package.json'), 'utf-8');
		const pkg = JSON.parse(raw) as { name?: string };
		return pkg.name ?? null;
	} catch {
		return null;
	}
}

export async function resolveProjectId(cwd: string = process.cwd()): Promise<string> {
	// resolve symlinks so macOS /var/folders → /private/var/folders doesn't produce different IDs
	const resolvedCwd = await realpath(cwd).catch(() => cwd);
	const source = (await getGitRemote(resolvedCwd)) ?? resolvedCwd;
	const hash = xxh3.xxh64(source).toString(16).padStart(16, '0');
	return hash.slice(0, 16);
}

export async function resolveProjectName(cwd: string = process.cwd()): Promise<string> {
	return (await getPackageName(cwd)) ?? basename(cwd);
}

export async function assertInitialized(projectId: string): Promise<void> {
	const paths = getPaths(projectId);
	if (!existsSync(paths.projectMeta)) {
		throw new XctxError('Project not initialized. Run `xctx init` first.');
	}
}
