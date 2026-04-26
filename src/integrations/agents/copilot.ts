export const MNEMO_BLOCK_MARKER = '## Mnemo — Codebase Memory';

export const COPILOT_INSTRUCTIONS_BLOCK = `## Mnemo — Codebase Memory

This project uses Mnemo for persistent context across AI sessions.

At the start of each session:

1. Run \`mnemo feat context\` to load the current feature context
2. Use \`mnemo search "<query>"\` before exploring unfamiliar code

When making architectural decisions, run:
\`mnemo feat decision "<your decision and rationale>"\`

When hitting a blocker:
\`mnemo feat blocker "<description>"\`

When linking relevant files:
\`mnemo feat link-file <path> --reason "<why>"\`
`;
