# Cross Context — Backlog

Ideas and future improvements not yet scheduled for implementation.
Items are grouped by theme, roughly ordered by impact within each group.

---

## Memory Layers

> ✅ Shipped in v1.5.0

Project memory (`~/.xctx/projects/{id}/memory.jsonl`), user memory (`~/.xctx/memory.jsonl`), full CLI (`xctx memory add/list/remove/search --project/--user`), MCP tools (`add_project_memory`, `add_user_memory`, `search_project_memory`, `search_user_memory`, `list_memories`), distillation flow in `xctx feat done` + SKILL.md, memory sections prepended in `xctx feat context` output (user memory first, then project memory).

---

## Search & Retrieval

### `xctx ask "<question>"`
Single command that combines all memory layers into one synthesized answer.

- Queries: semantic index + project memory + user memory + active feat context
- Output: ranked, deduplicated results with source attribution
- MCP tool: `ask_codebase`
- Different from `xctx search`: search returns chunks, ask returns a synthesized answer

### Fuzzy Matching for Graph Commands
Semantic search already handles typos/synonyms in natural language queries via embeddings.
Fuzzy is useful for exact-name lookups in graph commands:

- `xctx graph symbols "UserServce"` → suggests `UserService`
- `xctx graph deps` with partial path → resolves to closest match
- Use a library like `fuse.js` or simple Levenshtein distance
- Scope: graph subcommands only (`deps`, `refs`, `affected`, `symbols`)

---

## MCP Parity

> ✅ Graph tools shipped in v1.5.1: `get_deps`, `get_refs`, `get_affected`, `get_symbols` — extracted to dedicated `tools/graph.ts`, with automatic path resolution (accepts absolute, relative, or project-relative paths).

Remaining gap:

- `ask_codebase` (depends on `xctx ask`, see above)

---

## Branding & Repositioning
After project memory and user memory are shipped, revisit the product positioning entirely.

- Rewrite README, docs, and website to reflect the full value proposition
- Current framing ("persistent memory of a codebase for AI agents") undersells the cross-agent angle
- New positioning direction: **permanent, cross-session, cross-agent memory** — the memory layer that lives outside any single agent, survives context resets, and follows the developer across tools
- Tagline candidates: "The memory layer your agents share", "One memory, every agent", "Persistent context across Claude, Copilot, Cursor, and beyond"
- Rewrite the three-layer model to lead with memory (project + user + feat) rather than index/graph/feat
- Update all install flows to emphasize that memory is agent-agnostic from day one

---

## UX / Quality of Life

- `xctx update --watch` — watch mode, re-index on file save (debounced)
- `xctx status` should show project memory count and user memory count
- `xctx doctor` should verify memory stores are readable
- `xctx feat context` should include a "Project Memory" and "User Memory" section at the top
