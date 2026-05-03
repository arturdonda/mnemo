export const XCTX_BLOCK_MARKER = '## Cross Context — Codebase Memory';

// SKILL.md — cross-agent open standard (Copilot, Cursor, Windsurf, etc.)
// Each skill lives in its own subdirectory: {agent-skills-dir}/xctx/SKILL.md
export const SKILL_MD = `---
name: xctx
description: Load Cross Context codebase memory context. Invoke at the start of every session, before exploring unfamiliar code, or when asked about the current feature being developed.
---

Run \`xctx feat context\` to load the active feature context into this session.

The output contains: user memory (cross-agent), project memory (architectural decisions), active feature name, relevant files, decisions, blockers, and current status. Use this context to guide your work throughout the session.

## Use xctx throughout the session

Before exploring unfamiliar code:
\`\`\`
xctx search "<query>"
xctx graph deps <file>
xctx graph refs <file>
\`\`\`

After making an architectural decision:
\`\`\`
xctx feat decision "<decision and rationale>"
\`\`\`

When hitting or resolving a blocker:
\`\`\`
xctx feat blocker "<description>"
xctx feat blocker resolve "<description>"
\`\`\`

To record notes or link relevant files:
\`\`\`
xctx feat note "<note>"
xctx feat link-file <path>
\`\`\`

## When finishing a feature

Run \`xctx feat done\` and review the printed feature summary.
Promote any reusable insights to permanent memory before closing the session:
\`\`\`
# Architectural decisions, patterns, or conventions for this project:
xctx memory add --project "<insight>"

# Personal preferences or patterns you apply across all projects and agents:
xctx memory add --user "<insight>"
\`\`\`

Project memory persists across features. User memory persists across projects AND agents.
`;

export const XCTX_AGENT_BLOCK = `## Cross Context — Codebase Memory

This project uses Cross Context for persistent context across AI sessions and agents. **You MUST use xctx at the start of every session and throughout development.**

### MCP tools (preferred over CLI)

Cross Context is registered as an MCP server. Use MCP tools when available — they require no shell permissions:

| MCP tool                | CLI equivalent                                    |
|-------------------------|---------------------------------------------------|
| \`get_feat_context\`      | \`xctx feat context\`                               |
| \`search_codebase\`       | \`xctx search "<query>"\`                          |
| \`record_decision\`       | \`xctx feat decision "<text>"\`                    |
| \`record_blocker\`        | \`xctx feat blocker "<text>"\`                     |
| \`resolve_blocker\`       | \`xctx feat blocker resolve "<text>"\`             |
| \`link_file\`             | \`xctx feat link-file <path>\`                     |
| \`get_deps\`              | \`xctx graph deps <file>\`                         |
| \`get_refs\`              | \`xctx graph refs <file>\`                         |
| \`get_affected\`          | \`xctx graph affected <file>\`                     |
| \`get_symbols\`           | \`xctx graph symbols <file>\`                      |
| \`add_project_memory\`    | \`xctx memory add --project "<insight>"\`          |
| \`add_user_memory\`       | \`xctx memory add --user "<insight>"\`             |
| \`search_project_memory\` | \`xctx memory search --project "<query>"\`         |
| \`search_user_memory\`    | \`xctx memory search --user "<query>"\`            |
| \`list_memories\`         | \`xctx memory list\`                               |

### Required: start of every session

Call \`get_feat_context\` (MCP) or run this CLI command FIRST, before reading any files:

\`\`\`
xctx feat context
\`\`\`

The output includes **user memory** (your personal patterns, cross-agent), **project memory** (architectural decisions for this project), and the active feature context.

### Before exploring unfamiliar code

Always search before reading files:

\`\`\`
xctx search "<query>"
xctx graph deps <file>
xctx graph refs <file>
xctx graph affected <file>
\`\`\`

### During development

Record decisions, blockers, and notes as you work:

\`\`\`
xctx feat decision "<decision and rationale>"
xctx feat blocker "<description>"
xctx feat blocker resolve "<description>"
xctx feat note "<note>"
xctx feat link-file <path>
\`\`\`

### When finishing a feature

Run \`xctx feat done\` and review the printed feature summary.
Promote any reusable insights to permanent memory:

\`\`\`
# Architectural decisions or patterns specific to this project:
xctx memory add --project "<insight>"

# Personal preferences or patterns you apply across all projects and agents:
xctx memory add --user "<insight>"
\`\`\`

User memory is **cross-agent** — it is visible to Claude, Copilot, Cursor, Windsurf, and any other agent using xctx.

### Full command reference

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
xctx feat done                  — mark feature as complete (prints summary for distillation)

xctx memory add --project "<text>"  — save architectural insight to project memory
xctx memory add --user "<text>"     — save personal pattern to user memory (cross-agent)
xctx memory list                    — list all memories (project + user)
xctx memory search "<query>"        — keyword search across memories
xctx memory remove <id>             — remove a memory entry

xctx search "<query>"           — semantic search (use before exploring unknown code)
xctx graph deps <file>          — files this file imports
xctx graph refs <file>          — files that import this file
xctx graph affected <file>      — transitive dependents (max depth 3)
xctx graph symbols <file>       — top-level functions/classes in a file

xctx update                     — re-index the codebase
xctx status                     — show index health
\`\`\`
`;
