import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { XCTX_AGENT_BLOCK } from './shared.js';

export { XCTX_BLOCK_MARKER } from './shared.js';

const CLAUDE_EXTRA = `
## Cross Context MCP tools (preferred over CLI)

Cross Context is registered as an MCP server. Use MCP tools when available — they require no shell permissions:

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

See \`.claude/skills/xctx.md\` for slash commands (\`/xctx-context\`, \`/xctx-search\`, etc.).
`;

export const CLAUDE_MD_BLOCK = XCTX_AGENT_BLOCK + CLAUDE_EXTRA;

const MCP_SERVER_KEY = 'xctx';

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

	mcpServers[MCP_SERVER_KEY] = { command: 'xctx', args: ['mcp', 'serve'], type: 'stdio' };
	settings.mcpServers = mcpServers;

	mkdirSync(claudeDir, { recursive: true });
	writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
	return { configured: true, path: settingsPath };
}

export const SKILL_CONTENT = `# xctx — codebase memory

This project uses Cross Context for persistent codebase memory. You MUST use xctx throughout every session.

## How xctx is available in this session

Cross Context is registered as an **MCP server** in this Claude Code installation. Prefer MCP tools over CLI when both are available — they work without shell permissions and respond faster.

| MCP tool              | Equivalent CLI                        |
|-----------------------|---------------------------------------|
| \`get_feat_context\`    | \`xctx feat context\`                   |
| \`search_codebase\`     | \`xctx search "<query>"\`               |
| \`record_decision\`     | \`xctx feat decision "<text>"\`         |
| \`record_blocker\`      | \`xctx feat blocker "<text>"\`          |
| \`resolve_blocker\`     | \`xctx feat blocker resolve "<text>"\`  |
| \`link_file\`           | \`xctx feat link-file <path>\`          |
| \`get_deps\`            | \`xctx graph deps <file>\`              |
| \`get_refs\`            | \`xctx graph refs <file>\`              |
| \`get_symbols\`         | \`xctx graph symbols <file>\`           |

## Required: start of every session

Call \`get_feat_context\` (MCP) or run this CLI command FIRST, before reading any files:

\`\`\`
xctx feat context
\`\`\`

## Slash commands

/xctx-context — Load current feature context
Runs: xctx feat context

/xctx-search <query> — Semantic search across the codebase (use before exploring unfamiliar code)
Runs: xctx search "<query>"

/xctx-decision <text> — Record an architectural decision
Runs: xctx feat decision "<text>"

/xctx-blocker <text> — Record a blocker
Runs: xctx feat blocker "<text>"

/xctx-note <text> — Record a note
Runs: xctx feat note "<text>"

## Full CLI reference

\`\`\`
xctx feat context               — load active feature context (run at session start)
xctx feat suggest-files         — suggest files to link based on current context
xctx feat start <name>          — start tracking a new feature
xctx feat list                  — list all features
xctx feat switch <name>         — switch active feature
xctx feat decision "<text>"     — record an architectural decision
xctx feat blocker "<text>"      — record a blocker
xctx feat blocker resolve "<text>" — resolve a blocker
xctx feat note "<text>"         — record a note
xctx feat status "<text>"       — update feature status
xctx feat link-file <path>      — link a file to the current feature
xctx feat done                  — mark feature as complete

xctx search "<query>"           — semantic search (use before exploring unknown code)
xctx search "<query>" --include-tests  — include test/sample files in results
xctx graph deps <file>          — files this file imports
xctx graph refs <file>          — files that import this file
xctx graph affected <file>      — transitive dependents (max depth 3)
xctx graph symbols <file>       — top-level functions/classes in a file

xctx update                     — re-index the codebase
xctx status                     — show index health
\`\`\`
`;
