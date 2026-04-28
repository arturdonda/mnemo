import { MNEMO_AGENT_BLOCK } from './shared.js';

export { MNEMO_BLOCK_MARKER } from './shared.js';

export const CLAUDE_MD_BLOCK =
	MNEMO_AGENT_BLOCK + '\nSee `.claude/skills/mnemo.md` for slash commands (`/mnemo-context`, `/mnemo-search`, etc.).\n';

export const SKILL_CONTENT = `# mnemo — codebase memory

This project uses Mnemo for persistent codebase memory. You MUST use mnemo commands throughout every session.

## Required: start of every session

Run this FIRST, before reading any files:

\`\`\`
mnemo feat context
\`\`\`

This loads the active feature context: relevant files, past decisions, blockers, and current status.

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

## Full command reference

\`\`\`
mnemo feat context               — load active feature context (run at session start)
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
mnemo graph deps <file>          — files this file imports
mnemo graph refs <file>          — files that import this file
mnemo graph affected <file>      — transitive dependents (max depth 3)
mnemo graph symbols <file>       — top-level functions/classes in a file

mnemo update                     — re-index the codebase
mnemo status                     — show index health
\`\`\`
`;
