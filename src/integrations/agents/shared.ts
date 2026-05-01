export const MNEMO_BLOCK_MARKER = '## Mnemo — Codebase Memory';

// SKILL.md — cross-agent open standard (Copilot, Cursor, Windsurf, etc.)
// Each skill lives in its own subdirectory: {agent-skills-dir}/mnemo/SKILL.md
export const SKILL_MD = `---
name: mnemo
description: Load Mnemo codebase memory context. Invoke at the start of every session, before exploring unfamiliar code, or when asked about the current feature being developed.
---

Run \`mnemo feat context\` to load the active feature context into this session.

The output contains: user memory (cross-agent), project memory (architectural decisions), active feature name, relevant files, decisions, blockers, and current status. Use this context to guide your work throughout the session.

## Use mnemo throughout the session

Before exploring unfamiliar code:
\`\`\`
mnemo search "<query>"
mnemo graph deps <file>
mnemo graph refs <file>
\`\`\`

After making an architectural decision:
\`\`\`
mnemo feat decision "<decision and rationale>"
\`\`\`

When hitting or resolving a blocker:
\`\`\`
mnemo feat blocker "<description>"
mnemo feat blocker resolve "<description>"
\`\`\`

To record notes or link relevant files:
\`\`\`
mnemo feat note "<note>"
mnemo feat link-file <path>
\`\`\`

## When finishing a feature

Run \`mnemo feat done\` and review the printed feature summary.
Promote any reusable insights to permanent memory before closing the session:
\`\`\`
# Architectural decisions, patterns, or conventions for this project:
mnemo memory add --project "<insight>"

# Personal preferences or patterns you apply across all projects and agents:
mnemo memory add --user "<insight>"
\`\`\`

Project memory persists across features. User memory persists across projects AND agents.
`;

export const MNEMO_AGENT_BLOCK = `## Mnemo — Codebase Memory

This project uses Mnemo for persistent context across AI sessions and agents. **You MUST use mnemo at the start of every session and throughout development.**

### MCP tools (preferred over CLI)

Mnemo is registered as an MCP server. Use MCP tools when available — they require no shell permissions:

| MCP tool                | CLI equivalent                                    |
|-------------------------|---------------------------------------------------|
| \`get_feat_context\`      | \`mnemo feat context\`                              |
| \`search_codebase\`       | \`mnemo search "<query>"\`                         |
| \`record_decision\`       | \`mnemo feat decision "<text>"\`                   |
| \`record_blocker\`        | \`mnemo feat blocker "<text>"\`                    |
| \`resolve_blocker\`       | \`mnemo feat blocker resolve "<text>"\`            |
| \`link_file\`             | \`mnemo feat link-file <path>\`                    |
| \`get_deps\`              | \`mnemo graph deps <file>\`                        |
| \`get_refs\`              | \`mnemo graph refs <file>\`                        |
| \`get_symbols\`           | \`mnemo graph symbols <file>\`                     |
| \`add_project_memory\`    | \`mnemo memory add --project "<insight>"\`         |
| \`add_user_memory\`       | \`mnemo memory add --user "<insight>"\`            |
| \`search_project_memory\` | \`mnemo memory search --project "<query>"\`        |
| \`search_user_memory\`    | \`mnemo memory search --user "<query>"\`           |
| \`list_memories\`         | \`mnemo memory list\`                              |

### Required: start of every session

Call \`get_feat_context\` (MCP) or run this CLI command FIRST, before reading any files:

\`\`\`
mnemo feat context
\`\`\`

The output includes **user memory** (your personal patterns, cross-agent), **project memory** (architectural decisions for this project), and the active feature context.

### Before exploring unfamiliar code

Always search before reading files:

\`\`\`
mnemo search "<query>"
mnemo graph deps <file>
mnemo graph refs <file>
mnemo graph affected <file>
\`\`\`

### During development

Record decisions, blockers, and notes as you work:

\`\`\`
mnemo feat decision "<decision and rationale>"
mnemo feat blocker "<description>"
mnemo feat blocker resolve "<description>"
mnemo feat note "<note>"
mnemo feat link-file <path>
\`\`\`

### When finishing a feature

Run \`mnemo feat done\` and review the printed feature summary.
Promote any reusable insights to permanent memory:

\`\`\`
# Architectural decisions or patterns specific to this project:
mnemo memory add --project "<insight>"

# Personal preferences or patterns you apply across all projects and agents:
mnemo memory add --user "<insight>"
\`\`\`

User memory is **cross-agent** — it is visible to Claude, Copilot, Cursor, Windsurf, and any other agent using mnemo.

### Full command reference

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
mnemo feat done                  — mark feature as complete (prints summary for distillation)

mnemo memory add --project "<text>"  — save architectural insight to project memory
mnemo memory add --user "<text>"     — save personal pattern to user memory (cross-agent)
mnemo memory list                    — list all memories (project + user)
mnemo memory search "<query>"        — keyword search across memories
mnemo memory remove <id>             — remove a memory entry

mnemo search "<query>"           — semantic search (use before exploring unknown code)
mnemo graph deps <file>          — files this file imports
mnemo graph refs <file>          — files that import this file
mnemo graph affected <file>      — transitive dependents (max depth 3)
mnemo graph symbols <file>       — top-level functions/classes in a file

mnemo update                     — re-index the codebase
mnemo status                     — show index health
\`\`\`
`;
