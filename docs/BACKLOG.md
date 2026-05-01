# Mnemo — Backlog

Ideas and future improvements not yet scheduled for implementation.
Items are grouped by theme, roughly ordered by impact within each group.

---

## Memory Layers

### Project Memory
Persistent memory scoped to the current project, surviving across features.

- New store: `~/.mnemo/projects/{id}/memory.jsonl`
- Schema: `{ id, text, source: 'feat:<name>' | 'manual', createdAt, tags }`
- Commands:
  - `mnemo memory add --project "<insight>"` — add a project-level memory
  - `mnemo memory list --project` — list all project memories
  - `mnemo memory remove --project <id>` — remove a memory
  - `mnemo memory search --project "<query>"` — semantic search over memories
- MCP tool: `search_project_memory`
- Exposed in `mnemo feat context` output (bottom section)

### User / Global Memory
Cross-agent, cross-project memory. The key differentiator: unlike agent-specific memory (Claude's `CLAUDE.md`, Copilot's instructions), this follows the user across ALL agents and ALL projects via mnemo.

- New store: `~/.mnemo/memory.jsonl`
- Schema: same as project memory
- Commands: same pattern with `--user` flag instead of `--project`
- MCP tool: `search_user_memory`
- Exposed in `mnemo feat context` output (top section, before project memory)
- Use cases: coding preferences, patterns the user applies everywhere, personal conventions

### Agent-driven Distillation on `mnemo feat done`
No LLM API key required — the running agent does the distillation work.

- `mnemo feat done` prints the full feature context to stdout
- SKILL.md (installed by `mnemo install <agent>`) instructs the agent to:
  1. Read the context
  2. Extract insights worth persisting (decisions, patterns, lessons learned)
  3. Classify each as project-level or user-level
  4. Call `mnemo memory add --project "<insight>"` or `mnemo memory add --user "<insight>"`
- This keeps mnemo dependency-free while leveraging the agent already in the conversation

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

- `search_project_memory` / `search_user_memory` (new, see above)
- `ask_codebase` (new, see above)
- `get_graph_deps` / `get_graph_refs` / `get_graph_affected` / `get_graph_symbols`
- `add_memory` (project and user)
- `list_memories`

---

## UX / Quality of Life

- `mnemo update --watch` — watch mode, re-index on file save (debounced)
- `mnemo status` should show project memory count and user memory count
- `mnemo doctor` should verify memory stores are readable
- `mnemo feat context` should include a "Project Memory" and "User Memory" section at the top
