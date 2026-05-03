# Product Requirements Document

**Product:** Cross Context
**CLI command:** `xctx`
**Status:** Draft
**Last updated:** 2026-04-25

---

## 1. Problem Statement

### 1.1 Background

AI coding assistants (Claude Code, GitHub Copilot, Cursor, Codex) have fundamentally changed software development. However, all of them share a critical inefficiency: **they start every session with zero knowledge of the codebase**.

Each new session triggers a repetitive discovery cycle:

- Read directory trees to understand project structure
- Trace imports and dependencies to find relevant files
- Re-read files already read in previous sessions
- Reconstruct architectural context lost since the last conversation

On a 50k+ LOC project, this pre-work costs 2,000–8,000 tokens before any productive work begins. Multiply by 10+ sessions per day and the waste compounds into real money and real latency.

### 1.2 Core Problems

**P1 — Cold start waste**
Every session starts from zero. The agent has no memory of what it already discovered.

**P2 — Iterative graph traversal**
Understanding module dependencies requires multiple file hops: find X → X imports Y → read Y → Y imports Z → read Z. This is O(depth) in file reads.

**P3 — Lost cross-session context**
Architectural decisions, trade-offs, and "why we did it this way" disappear between sessions. The agent may re-open discussions already resolved.

**P4 — No feature-level continuity**
When working on a multi-session feature, there is no mechanism to persist: which files are in scope, what has been decided, what is blocked, what the next step is.

**P5 — Tool lock-in**
Most solutions (Continue.dev, Cody) require a specific editor. Developers using multiple agents or terminal-based tools are left out.

---

## 2. Target Users

### Primary: Individual developers using AI coding assistants

- Uses 2+ AI tools (e.g., Claude Code in terminal + Copilot in editor)
- Works on projects with 10k–500k LOC
- Runs multiple sessions per day on the same codebase
- Pain: repeating context setup every session
- Willing to install a CLI tool with minimal configuration

### Secondary: Dev teams with shared AI tooling

- Multiple developers using AI on the same codebase
- Shared FEAT context would allow one developer's session context to benefit another's
- Requires: shared/synced index storage (post-MVP)

### Out of scope (v1)

- Enterprise/monorepo scale (10M+ LOC)
- IDEs as primary interface (Continue.dev already covers this well)
- Non-technical users

---

## 3. Goals

### Must Have (MVP)

- `xctx init` — set up indexes for a project
- `codeindex search <query>` — semantic search across codebase
- `codeindex feat start <name>` — create a feature context
- `codeindex feat note <text>` — record a decision or observation
- `codeindex feat context` — dump feature context as markdown (for agent consumption)
- Auto-update via git hooks (post-commit)
- Works on Windows, macOS, Linux
- Zero external infrastructure (SQLite only)

### Should Have (v1.1)

- Structural graph index (Tree-sitter)
- `codeindex graph deps <file>` — show what a file depends on
- `codeindex graph refs <symbol>` — show where a symbol is used
- Claude Code Skill (`/feat-context`, `/feat-note`, `/search`)
- MCP server for other agent integrations
- Hash-based freshness validation on query
- File watcher (optional, opt-in)

### Nice to Have (v2)

- Obsidian vault export
- Web UI for browsing context
- Team sync (shared index via git or cloud)
- GitHub Actions integration for CI-aware indexing
- Per-language parser plugins

### Out of Scope

- Code generation
- Agent orchestration
- Replacing the AI model or coding assistant itself

---

## 4. Non-Goals

- codeindexer does **not** write or modify source code
- codeindexer does **not** manage AI model configuration
- codeindexer does **not** require an internet connection for core functionality
- codeindexer does **not** store code in any external service (all data is local)

---

## 5. Proposed Solution

### 5.1 Three-layer Index Architecture

```
┌───────────────────────────────────────────────────────┐
│                    codeindexer                        │
├───────────────────────────────────────────────────────┤
│  Layer 1: Semantic Index                              │
│  - Embeddings per file/chunk (sqlite-vec)             │
│  - Local embedding model (no API cost)                │
│  - Query: natural language → relevant files           │
├───────────────────────────────────────────────────────┤
│  Layer 2: Structural Graph                            │
│  - AST-derived via Tree-sitter                        │
│  - Nodes: files, classes, functions, exports          │
│  - Edges: imports, calls, inheritance                 │
│  - Query: dependency chains, symbol references        │
├───────────────────────────────────────────────────────┤
│  Layer 3: FEAT Context Cache                          │
│  - Per-feature/branch markdown + JSONL                │
│  - Records: relevant files, decisions, blockers, TODOs│
│  - Human-readable, agent-consumable                   │
│  - Persists across sessions                           │
└───────────────────────────────────────────────────────┘
```

### 5.2 Freshness Strategy

| Trigger                   | Action                       | Scope                |
| ------------------------- | ---------------------------- | -------------------- |
| `post-commit` git hook    | Re-index changed files       | Committed files only |
| Query time                | Hash check on returned files | Files in results     |
| Manual `codeindex update` | Full re-index                | Entire project       |
| File watcher (opt-in)     | Debounced re-index (3s)      | Saved files          |

The git hook approach covers 90% of cases with near-zero overhead. Hash validation at query time ensures results are never stale even for uncommitted changes.

### 5.3 Storage Layout

```
~/.codeindexer/
  config.json
  projects/
    {project-id}/           # derived from git remote URL hash
      meta.json             # project name, root path, last indexed
      vectors.db            # SQLite + sqlite-vec (semantic index)
      graph.db              # SQLite (structural graph)
      feats/
        {feat-name}/
          context.md        # human + agent readable summary
          decisions.jsonl   # append-only decision log
          files.txt         # relevant files list
          meta.json         # created, updated, branch, status
```

### 5.4 Agent Integration

**Claude Code Skill** (highest priority for MVP+):

```
/search <query>          → semantic search, returns file list + snippets
/feat-context            → dumps current feat context into prompt
/feat-note <decision>    → records decision to current feat
/feat-files              → lists relevant files for current feat
```

**MCP Server** (for Cursor, Copilot, etc.):

- Exposes same operations as tools via MCP protocol
- Single server instance, projects auto-detected by CWD

**Raw CLI** (always available, works with any agent via shell):

```bash
codeindex search "authentication" | pbcopy   # paste into any chat
codeindex feat context >> /tmp/context.md    # pipe to file
```

---

## 6. Success Metrics

### Quantitative

- Token reduction: target 40–60% fewer tokens spent on codebase exploration per session (measured via Claude Code token counter on benchmark projects)
- Index freshness: <5% stale results in benchmark (files modified after last commit)
- Query latency: semantic search <500ms on 100k LOC project
- Setup time: `xctx init` completes in <60s on 100k LOC project

### Qualitative

- Developer reports "I don't need to re-explain the project at the start of each session"
- FEAT cache eliminates re-litigating architectural decisions across sessions

---

## 7. Technical Constraints

- **SQLite only** — no external database, no server processes required
- **Local embeddings** — must work offline; default to a small, fast local model (e.g., `nomic-embed-text` via Ollama, or bundled ONNX model)
- **CLI-first** — all functionality accessible via terminal; UI is secondary
- **Node.js or Rust** — cross-platform, good ecosystem for both (TBD based on performance requirements for indexing)
- **Tree-sitter** — for structural parsing; supports 40+ languages including JS/TS, Python, Go, Rust, Java
- **Git-aware** — project identity derived from git remote; hooks installed automatically on `init`

---

## 8. Risks

| Risk                                                     | Likelihood | Impact | Mitigation                                                                  |
| -------------------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------- |
| Embedding model quality insufficient for code            | Medium     | High   | Benchmark code-specific models (CodeBERT, nomic-embed-text) before shipping |
| Index freshness bugs causing stale results               | Medium     | High   | Hash validation on every query; clear staleness indicators in output        |
| Tree-sitter coverage gaps (e.g. config files, templates) | High       | Low    | Limit graph features to supported languages; degrade gracefully             |
| Continue.dev ships identical FEAT cache feature          | Low        | High   | Ship MVP fast; differentiate on cross-agent, CLI-first angle                |
| SQLite performance on very large repos                   | Low        | Medium | Benchmark at 500k LOC; add chunking/partitioning if needed                  |

---

## 9. Open Questions

1. ~~**Language for CLI**~~ — **Resolved (D010)**: Node.js + TypeScript.
2. ~~**Default embedding model**~~ — **Resolved (D003, D008)**: Bundled ONNX (`all-MiniLM-L6-v2`) as default; Ollama as auto-detected alternative; OpenAI as explicit opt-in.
3. ~~**Product name**~~ — **Resolved (D011)**: **Cross Context**, CLI command `xctx`. npm package: `cross-context`.
4. **Monetization**: Leaning toward free CLI (open source) + paid team sync. Not yet decided.
5. **FEAT auto-naming**: Auto-detect from git branch name if a feat with matching branch exists. Explicit `--branch` flag overrides.

---

## 10. MVP Scope & Sequencing

### Phase 1 — FEAT Cache only (week 1–2)

Validate the highest-differentiated feature with minimal infrastructure.

- `init`, `feat start/note/context/list`
- Plain markdown + JSONL storage
- No embeddings, no graph
- Claude Code Skill for FEAT commands

**Validation gate**: Does the FEAT cache alone reduce session startup friction?

### Phase 2 — Semantic Index (week 3–5)

- SQLite + sqlite-vec setup
- Local embedding pipeline
- `search` command
- Git hook auto-indexing
- Hash-based freshness

**Validation gate**: Does `codeindex search` return useful results in <500ms?

### Phase 3 — Structural Graph (week 6–9)

- Tree-sitter integration
- Graph queries (`deps`, `refs`)
- MCP server

### Phase 4 — Polish & Distribution

- Installer for Win/Mac/Linux
- Documentation site
- VSCode extension (optional)
- Public launch
