import { z } from 'zod';
import { existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { simpleGit } from 'simple-git';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { resolveProjectId } from '../../../core/project.js';
import { getPaths } from '../../../core/paths.js';
import { GraphStore } from '../../../core/graph/store.js';

async function getProjectRoot(): Promise<string> {
	try {
		const git = simpleGit(process.cwd());
		const root = await git.revparse(['--show-toplevel']);
		return root.trim();
	} catch {
		return process.cwd();
	}
}

async function resolveFilePath(filePath: string): Promise<string> {
	const abs = resolve(process.cwd(), filePath);
	const root = await getProjectRoot();
	return relative(root, abs).replace(/\\/g, '/');
}

async function openStore(): Promise<{ store: GraphStore; paths: ReturnType<typeof getPaths> }> {
	const projectId = await resolveProjectId(process.cwd());
	const paths = getPaths(projectId);
	return { store: new GraphStore(paths.graphDb), paths };
}

const NOT_INDEXED = { content: [{ type: 'text' as const, text: 'Graph not indexed. Run `mnemo update` first.' }] };

export function registerGraphTools(server: McpServer): void {
	server.tool(
		'get_deps',
		'Get files that a given file imports (direct dependencies)',
		{ file: z.string().describe('File path (absolute, relative, or project-relative)') },
		async ({ file }) => {
			const { store, paths } = await openStore();
			if (!existsSync(paths.graphDb)) return NOT_INDEXED;
			try {
				const deps = store.getDeps(await resolveFilePath(file));
				return { content: [{ type: 'text' as const, text: deps.length === 0 ? 'No dependencies found.' : deps.join('\n') }] };
			} finally {
				store.close();
			}
		},
	);

	server.tool(
		'get_refs',
		'Get files that import a given file (reverse dependencies / who uses this file)',
		{ file: z.string().describe('File path (absolute, relative, or project-relative)') },
		async ({ file }) => {
			const { store, paths } = await openStore();
			if (!existsSync(paths.graphDb)) return NOT_INDEXED;
			try {
				const refs = store.getRefs(await resolveFilePath(file));
				return { content: [{ type: 'text' as const, text: refs.length === 0 ? 'No references found.' : refs.join('\n') }] };
			} finally {
				store.close();
			}
		},
	);

	server.tool(
		'get_affected',
		'Get all files transitively affected by changes to a given file (BFS up the import graph)',
		{
			file: z.string().describe('File path (absolute, relative, or project-relative)'),
			depth: z.number().int().min(1).max(10).optional().default(3).describe('Max BFS depth (default 3)'),
		},
		async ({ file, depth }) => {
			const { store, paths } = await openStore();
			if (!existsSync(paths.graphDb)) return NOT_INDEXED;
			try {
				const affected = store.getAffected(await resolveFilePath(file), depth ?? 3);
				return { content: [{ type: 'text' as const, text: affected.length === 0 ? 'No affected files found.' : affected.join('\n') }] };
			} finally {
				store.close();
			}
		},
	);

	server.tool(
		'get_symbols',
		'Get top-level functions and classes defined in a file',
		{ file: z.string().describe('File path (absolute, relative, or project-relative)') },
		async ({ file }) => {
			const { store, paths } = await openStore();
			if (!existsSync(paths.graphDb)) return NOT_INDEXED;
			try {
				const symbols = store.getSymbols(await resolveFilePath(file));
				if (symbols.length === 0) return { content: [{ type: 'text' as const, text: 'No symbols found.' }] };
				const text = symbols.map((s) => `${s.type.padEnd(8)} ${s.name}`).join('\n');
				return { content: [{ type: 'text' as const, text }] };
			} finally {
				store.close();
			}
		},
	);
}
