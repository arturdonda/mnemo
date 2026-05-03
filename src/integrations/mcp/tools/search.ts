import { z } from 'zod';
import { existsSync } from 'node:fs';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { resolveProjectId } from '../../../core/project.js';
import { getPaths } from '../../../core/paths.js';
import { createEmbedder } from '../../../core/index/embedder.js';
import { SqliteVecStore } from '../../../core/index/backends/sqlite-vec.js';
import { queryWithFreshness } from '../../../core/index/freshness.js';
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
				return { content: [{ type: 'text' as const, text: 'Project not indexed. Run `xctx update` first.' }] };
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

}
