export const MNEMO_BLOCK_MARKER = '## Mnemo — Codebase Memory';

// SKILL.md — cross-agent open standard (Copilot, Cursor, Windsurf, etc.)
// Each skill lives in its own subdirectory: {agent-skills-dir}/mnemo/SKILL.md
export const SKILL_MD = `---
name: mnemo
description: Load Mnemo codebase memory context. Invoke at the start of every session, before exploring unfamiliar code, or when asked about the current feature being developed.
---

Run \`mnemo feat context\` to load the active feature context into this session.

The output contains: active feature name, relevant files, architectural decisions, blockers, and current status. Use this context to guide your work throughout the session.

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
`;

export const MNEMO_AGENT_BLOCK = `## Mnemo — Codebase Memory

This project uses Mnemo for persistent context across AI sessions. **You MUST use mnemo at the start of every session and throughout development.**

### Required: start of every session

Run this FIRST before reading any files or making any changes:

\`\`\`
mnemo feat context
\`\`\`

### Before exploring unfamiliar code

Always search before reading files:

\`\`\`
mnemo search "<query>"
mnemo graph deps <file>
mnemo graph refs <file>
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

### Full command reference

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
