export const SKILL_CONTENT = `# mnemo — codebase memory

Run \`mnemo feat context\` at the start of any session to load the current feature context.

## Commands

/mnemo-context — Load current feature context into this session
Runs: mnemo feat context

/mnemo-decision <text> — Record an architectural decision
Runs: mnemo feat decision "<text>"

/mnemo-blocker <text> — Record a blocker
Runs: mnemo feat blocker "<text>"

/mnemo-note <text> — Record a note
Runs: mnemo feat note "<text>"
`;

export const CLAUDE_MD_BLOCK = `## Mnemo — Codebase Memory

This project uses Mnemo for persistent context across AI sessions.

At the start of each session:

1. Run \`mnemo feat context\` to load the current feature context
2. Use \`mnemo search "<query>"\` before exploring unfamiliar code (Phase 2)

When making architectural decisions, run:
\`mnemo feat decision "<your decision and rationale>"\`

When hitting a blocker:
\`mnemo feat blocker "<description>"\`
`;

export const MNEMO_BLOCK_MARKER = '## Mnemo — Codebase Memory';
