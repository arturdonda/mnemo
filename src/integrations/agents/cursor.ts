import { MNEMO_AGENT_BLOCK, SKILL_MD } from './shared.js';

export { MNEMO_BLOCK_MARKER } from './shared.js';

// .cursor/rules/mnemo.mdc — Cursor project rules (always applied)
export const CURSOR_RULES_BLOCK = MNEMO_AGENT_BLOCK;

export const CURSOR_RULE_FILE = `---
description: Mnemo codebase memory — persistent context across AI sessions
globs:
alwaysApply: true
---

${MNEMO_AGENT_BLOCK}`;

// .cursor/skills/mnemo/SKILL.md — Cursor Agent Skills (invokable)
export const CURSOR_SKILL_MD = SKILL_MD;
