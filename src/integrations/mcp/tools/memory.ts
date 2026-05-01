import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { resolveProjectId } from '../../../core/project.js';
import { getPaths, getUserMemoryPath } from '../../../core/paths.js';
import { addMemory, listMemories, searchMemories } from '../../../core/memory/store.js';

async function getProjectMemoryPath(): Promise<string> {
	const projectId = await resolveProjectId(process.cwd());
	return getPaths(projectId).projectMemoryFile;
}

export function registerMemoryTools(server: McpServer): void {
	server.tool(
		'add_project_memory',
		'Save a reusable insight to permanent project memory (architectural decisions, patterns, conventions)',
		{
			text: z.string().describe('The insight or decision to remember'),
			tags: z.array(z.string()).optional().describe('Optional tags for filtering'),
			source: z.string().optional().describe('Source label, e.g. "feat:payment-flow"'),
		},
		async ({ text, tags, source }) => {
			const filePath = await getProjectMemoryPath();
			const entry = await addMemory(filePath, { text, tags: tags ?? [], source: source ?? 'agent' });
			return { content: [{ type: 'text' as const, text: `Project memory saved: ${entry.id}\n"${text.slice(0, 100)}"` }] };
		},
	);

	server.tool(
		'add_user_memory',
		'Save a personal insight to permanent user memory (preferences, patterns that apply across all projects and agents)',
		{
			text: z.string().describe('The personal insight or preference to remember'),
			tags: z.array(z.string()).optional().describe('Optional tags for filtering'),
			source: z.string().optional().describe('Source label, e.g. "feat:payment-flow"'),
		},
		async ({ text, tags, source }) => {
			const entry = await addMemory(getUserMemoryPath(), { text, tags: tags ?? [], source: source ?? 'agent' });
			return { content: [{ type: 'text' as const, text: `User memory saved: ${entry.id}\n"${text.slice(0, 100)}"` }] };
		},
	);

	server.tool(
		'search_project_memory',
		'Search permanent project memory by keyword',
		{
			query: z.string().describe('Keyword to search for'),
		},
		async ({ query }) => {
			const filePath = await getProjectMemoryPath();
			const results = await searchMemories(filePath, query);
			if (results.length === 0) {
				return { content: [{ type: 'text' as const, text: `No project memories found matching "${query}".` }] };
			}
			const lines = results.map((e) => `[${e.id}] ${e.text}${e.tags.length > 0 ? ` (${e.tags.join(', ')})` : ''}`);
			return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
		},
	);

	server.tool(
		'search_user_memory',
		'Search permanent user memory by keyword (cross-project, cross-agent)',
		{
			query: z.string().describe('Keyword to search for'),
		},
		async ({ query }) => {
			const results = await searchMemories(getUserMemoryPath(), query);
			if (results.length === 0) {
				return { content: [{ type: 'text' as const, text: `No user memories found matching "${query}".` }] };
			}
			const lines = results.map((e) => `[${e.id}] ${e.text}${e.tags.length > 0 ? ` (${e.tags.join(', ')})` : ''}`);
			return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
		},
	);

	server.tool(
		'list_memories',
		'List all entries in project memory, user memory, or both',
		{
			scope: z.enum(['project', 'user', 'all']).optional().describe('Which memory scope to list (default: all)'),
		},
		async ({ scope = 'all' }) => {
			const lines: string[] = [];

			if (scope === 'user' || scope === 'all') {
				const entries = await listMemories(getUserMemoryPath());
				if (entries.length > 0) {
					lines.push('## User Memory\n');
					entries.forEach((e) => lines.push(`[${e.id}] ${e.text}`));
					lines.push('');
				}
			}

			if (scope === 'project' || scope === 'all') {
				const filePath = await getProjectMemoryPath();
				const entries = await listMemories(filePath);
				if (entries.length > 0) {
					lines.push('## Project Memory\n');
					entries.forEach((e) => lines.push(`[${e.id}] ${e.text}`));
				}
			}

			const text = lines.length > 0 ? lines.join('\n') : 'No memories found.';
			return { content: [{ type: 'text' as const, text }] };
		},
	);
}
