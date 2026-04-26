import { z } from 'zod';
import { existsSync } from 'node:fs';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { resolveProjectId } from '../../../core/project.js';
import { getPaths } from '../../../core/paths.js';
import { createEmbedder } from '../../../core/index/embedder.js';
import { SqliteVecStore } from '../../../core/index/backends/sqlite-vec.js';
import { queryWithFreshness } from '../../../core/index/freshness.js';
import { GraphStore } from '../../../core/graph/store.js';
import { readConfig } from '../../../core/config.js';

export function registerSearchTools(server: McpServer): void {
	server.tool(
		'search_codebase',
		'Search the indexed codebase using natural language; returns ranked chunks with file locations',
		{
			query: z.string().describe('Natural language search query'),
			limit: z.number().int().min(1).max(50).optional().default(10).describe('Max results to return'),
		},
		async ({ query, limit }) => {
			const projectId = await resolveProjectId(process.cwd());
			const paths = getPaths(projectId);

			if (!existsSync(paths.indexDb)) {
				return { content: [{ type: 'text' as const, text: 'Project not indexed. Run `mnemo update` first.' }] };
			}

			const config = await readConfig();
			const embedder = await createEmbedder(config);
			const store = new SqliteVecStore(paths.indexDb, embedder.dimensions);

			try {
				const [embedding] = await embedder.embed([query]);
				const results = await queryWithFreshness(store, embedder, embedding, limit ?? 10);
				return { content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }] };
			} finally {
				await store.close();
			}
		},
	);

	server.tool('get_deps', 'Get files that a given file imports (direct dependencies)', {
		file: z.string().describe('File path as stored in the graph index'),
	}, async ({ file }) => {
		const projectId = await resolveProjectId(process.cwd());
		const paths = getPaths(projectId);

		if (!existsSync(paths.graphDb)) {
			return { content: [{ type: 'text' as const, text: 'Graph not indexed. Run `mnemo update` first.' }] };
		}

		const store = new GraphStore(paths.graphDb);
		try {
			const deps = store.getDeps(file);
			return { content: [{ type: 'text' as const, text: deps.length === 0 ? 'No dependencies found.' : deps.join('\n') }] };
		} finally {
			store.close();
		}
	});

	server.tool('get_refs', 'Get files that import a given file (reverse dependencies)', {
		file: z.string().describe('File path as stored in the graph index'),
	}, async ({ file }) => {
		const projectId = await resolveProjectId(process.cwd());
		const paths = getPaths(projectId);

		if (!existsSync(paths.graphDb)) {
			return { content: [{ type: 'text' as const, text: 'Graph not indexed. Run `mnemo update` first.' }] };
		}

		const store = new GraphStore(paths.graphDb);
		try {
			const refs = store.getRefs(file);
			return { content: [{ type: 'text' as const, text: refs.length === 0 ? 'No references found.' : refs.join('\n') }] };
		} finally {
			store.close();
		}
	});

	server.tool('get_symbols', 'Get top-level functions and classes defined in a file', {
		file: z.string().describe('File path as stored in the graph index'),
	}, async ({ file }) => {
		const projectId = await resolveProjectId(process.cwd());
		const paths = getPaths(projectId);

		if (!existsSync(paths.graphDb)) {
			return { content: [{ type: 'text' as const, text: 'Graph not indexed. Run `mnemo update` first.' }] };
		}

		const store = new GraphStore(paths.graphDb);
		try {
			const symbols = store.getSymbols(file);
			if (symbols.length === 0) return { content: [{ type: 'text' as const, text: 'No symbols found.' }] };
			const text = symbols.map((s) => `${s.type.padEnd(8)} ${s.name}`).join('\n');
			return { content: [{ type: 'text' as const, text }] };
		} finally {
			store.close();
		}
	});
}
