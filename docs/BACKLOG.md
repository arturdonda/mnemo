# Mnemo — Backlog

Ideas and future improvements not yet scheduled for implementation.
Items are grouped by theme, roughly ordered by impact within each group.

---

## Memory Layers

> ✅ Shipped in v1.5.0

Project memory (`~/.mnemo/projects/{id}/memory.jsonl`), user memory (`~/.mnemo/memory.jsonl`), full CLI (`mnemo memory add/list/remove/search --project/--user`), MCP tools (`add_project_memory`, `add_user_memory`, `search_project_memory`, `search_user_memory`, `list_memories`), distillation flow in `mnemo feat done` + SKILL.md, memory sections prepended in `mnemo feat context` output (user memory first, then project memory).

---

## Search & Retrieval

### `mnemo ask "<question>"`
Single command that combines all memory layers into one synthesized answer.

- Queries: semantic index + project memory + user memory + active feat context
- Output: ranked, deduplicated results with source attribution
- MCP tool: `ask_codebase`
- Different from `mnemo search`: search returns chunks, ask returns a synthesized answer

### Fuzzy Matching for Graph Commands
Semantic search already handles typos/synonyms in natural language queries via embeddings.
Fuzzy is useful for exact-name lookups in graph commands:

- `mnemo graph symbols "UserServce"` → suggests `UserService`
- `mnemo graph deps` with partial path → resolves to closest match
- Use a library like `fuse.js` or simple Levenshtein distance
- Scope: graph subcommands only (`deps`, `refs`, `affected`, `symbols`)

---

## MCP Parity
Everything available in the CLI should be available as an MCP tool.
Current gaps (not yet exposed via MCP):

- `ask_codebase` (depends on `mnemo ask`, see above)
- `get_graph_deps` / `get_graph_refs` / `get_graph_affected` / `get_graph_symbols`

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

- `mnemo update --watch` — watch mode, re-index on file save (debounced)
- `mnemo status` should show project memory count and user memory count
- `mnemo doctor` should verify memory stores are readable
- `mnemo feat context` should include a "Project Memory" and "User Memory" section at the top
