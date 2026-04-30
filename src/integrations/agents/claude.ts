import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { MNEMO_AGENT_BLOCK } from './shared.js';

export { MNEMO_BLOCK_MARKER } from './shared.js';

const CLAUDE_EXTRA = `
## Mnemo MCP tools (preferred over CLI)

Mnemo is registered as an MCP server. Use MCP tools when available — they require no shell permissions:

| MCP tool            | What it does                              |
|---------------------|-------------------------------------------|
| \`get_feat_context\`  | Load active feature context               |
| \`search_codebase\`   | Semantic search across the codebase       |
| \`record_decision\`   | Record an architectural decision          |
| \`record_blocker\`    | Record a blocker                          |
| \`resolve_blocker\`   | Resolve a blocker by substring match      |
| \`link_file\`         | Link a file to the active feature         |
| \`get_deps\`          | Files a given file imports                |
| \`get_refs\`          | Files that import a given file            |
| \`get_symbols\`       | Top-level functions/classes in a file     |

See \`.claude/skills/mnemo.md\` for slash commands (\`/mnemo-context\`, \`/mnemo-search\`, etc.).
`;

export const CLAUDE_MD_BLOCK = MNEMO_AGENT_BLOCK + CLAUDE_EXTRA;

const MCP_SERVER_KEY = 'mnemo';

export async function configureClaudeCodeMcp(): Promise<{ configured: boolean; path: string }> {
	const claudeDir = join(homedir(), '.claude');
	const settingsPath = join(claudeDir, 'settings.json');

	if (!existsSync(claudeDir)) {
		return { configured: false, path: settingsPath };
	}

	let settings: Record<string, unknown> = {};
	try {
		settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
	} catch {
		// file doesn't exist yet — start fresh
	}

	const mcpServers = (settings.mcpServers ?? {}) as Record<string, unknown>;
	if (mcpServers[MCP_SERVER_KEY]) {
		return { configured: false, path: settingsPath }; // already registered
	}

	mcpServers[MCP_SERVER_KEY] = { command: 'mnemo', args: ['mcp', 'serve'], type: 'stdio' };
	settings.mcpServers = mcpServers;

	mkdirSync(claudeDir, { recursive: true });
	writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
	return { configured: true, path: settingsPath };
}

export const SKILL_CONTENT = `# mnemo — codebase memory

This project uses Mnemo for persistent codebase memory. You MUST use mnemo throughout every session.

## How mnemo is available in this session

Mnemo is registered as an **MCP server** in this Claude Code installation. Prefer MCP tools over CLI when both are available — they work without shell permissions and respond faster.

| MCP tool              | Equivalent CLI                        |
|-----------------------|---------------------------------------|
| \`get_feat_context\`    | \`mnemo feat context\`                  |
| \`search_codebase\`     | \`mnemo search "<query>"\`              |
| \`record_decision\`     | \`mnemo feat decision "<text>"\`        |
| \`record_blocker\`      | \`mnemo feat blocker "<text>"\`         |
| \`resolve_blocker\`     | \`mnemo feat blocker resolve "<text>"\` |
| \`link_file\`           | \`mnemo feat link-file <path>\`         |
| \`get_deps\`            | \`mnemo graph deps <file>\`             |
| \`get_refs\`            | \`mnemo graph refs <file>\`             |
| \`get_symbols\`         | \`mnemo graph symbols <file>\`          |

## Required: start of every session

Call \`get_feat_context\` (MCP) or run this CLI command FIRST, before reading any files:

\`\`\`
mnemo feat context
\`\`\`

## Slash commands

/mnemo-context — Load current feature context
Runs: mnemo feat context

/mnemo-search <query> — Semantic search across the codebase (use before exploring unfamiliar code)
Runs: mnemo search "<query>"

/mnemo-decision <text> — Record an architectural decision
Runs: mnemo feat decision "<text>"

/mnemo-blocker <text> — Record a blocker
Runs: mnemo feat blocker "<text>"

/mnemo-note <text> — Record a note
Runs: mnemo feat note "<text>"

## Full CLI reference

\`\`\`
mnemo feat context               — load active feature context (run at session start)
mnemo feat suggest-files         — suggest files to link based on current context
mnemo feat start <name>          — start tracking a new feature
mnemo feat list                  — list all features
mnemo feat switch <name>         — switch active feature
mnemo feat decision "<text>"     — record an architectural decision
mnemo feat blocker "<text>"      — record a blocker
mnemo feat blocker resolve "<text>" — resolve a blocker
mnemo feat note "<text>"         — record a note
mnemo feat status "<text>"       — update feature status
mnemo feat link-file <path>      — link a file to the current feature
mnemo feat done                  — mark feature as complete

mnemo search "<query>"           — semantic search (use before exploring unknown code)
mnemo search "<query>" --include-tests  — include test/sample files in results
mnemo graph deps <file>          — files this file imports
mnemo graph refs <file>          — files that import this file
mnemo graph affected <file>      — transitive dependents (max depth 3)
mnemo graph symbols <file>       — top-level functions/classes in a file

mnemo update                     — re-index the codebase
mnemo status                     — show index health
\`\`\`
`;
