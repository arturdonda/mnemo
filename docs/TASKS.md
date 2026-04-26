# Tasks — Phase 1: FEAT Context Cache

**Goal:** Functional CLI to create and maintain feature context, with a Claude Code Skill.  
**Done when:** `mnemo init`, all `mnemo feat *` commands, and `mnemo install claude` work end-to-end.

Embedding layers (Phase 2) and structural graph (Phase 3) are **out of scope for this phase**.

---

## How to use this file

- Mark tasks as `[x]` when complete
- Add implementation notes below a task if relevant
- Do not reorder without reason — the sequence is intentional (dependencies)

---

## Block 1 — Project setup

### T001 — Initialize package.json and install dependencies

- [x] Create `package.json` per spec in `docs/STACK.md`
- [x] `npm install commander better-sqlite3 @node-rs/xxhash chokidar simple-git`
- [x] `npm install -D typescript vitest @biomejs/biome @types/better-sqlite3 @types/node`
- [x] Create `tsconfig.json` per spec in `docs/STACK.md`
- [x] Create `biome.json` per spec in `docs/STACK.md`
- [x] Create `.gitignore` — done

**Done when:** `npm run typecheck` passes with no errors on an empty project.

---

### T002 — Entry point and command structure

- [x] Create `src/cli.ts` with Commander Program registering all command groups
- [x] Create `src/commands/feat.ts` with empty subcommands (no logic yet)
- [x] Create `src/commands/init.ts` empty
- [x] Create `src/commands/install.ts` empty
- [x] Create `src/commands/config.ts` empty
- [x] Create `src/core/error.ts` with `MnemoError` and `handleError()`

**Done when:** `mnemo --help` lists commands; `mnemo feat --help` lists subcommands.

---

## Block 2 — Core: paths and project identity

### T003 — Paths: `~/.mnemo/` directory structure

- [x] Create `src/core/paths.ts`
- [x] Implement `getPaths(projectId: string)` returning all relevant paths
- [x] Implement `ensurePaths(projectId: string)` creating dirs if they don't exist
- [x] Write tests: `tests/core/paths.test.ts`

```typescript
type MnemoPaths = {
	root: string; // ~/.mnemo
	projectRoot: string; // ~/.mnemo/projects/{id}
	featsDir: string; // ~/.mnemo/projects/{id}/feats
	activeFeatFile: string; // ~/.mnemo/projects/{id}/active_feat
	projectMeta: string; // ~/.mnemo/projects/{id}/meta.json
	featDir: (name: string) => string;
	eventsFile: (name: string) => string;
	contextFile: (name: string) => string;
	featMeta: (name: string) => string;
};
```

**Done when:** tests pass; dirs are created correctly under `~/.mnemo/`.

---

### T004 — Project identity

- [x] Create `src/core/project.ts`
- [x] Implement `resolveProjectId()`: tries git remote URL, falls back to `cwd()`
- [x] Hash with XXH3 (64-bit, hex, first 16 chars)
- [x] Implement `resolveProjectName()`: directory name or `name` field from package.json
- [x] Implement `assertInitialized()`: checks if `mnemo init` has been run; throws `MnemoError` if not
- [x] Write tests: `tests/core/project.test.ts`

**Done when:** `resolveProjectId()` returns a stable hash for the same project; tests pass.

---

## Block 3 — Core: FEAT store

### T005 — FEAT cache types

- [x] Create `src/core/feat/types.ts` with all types:

```typescript
type EventType = 'feat_created' | 'decision' | 'blocker' | 'blocker_resolved' | 'file_linked' | 'file_unlinked' | 'status' | 'note' | 'feat_done';

type FeatureEvent = {
	ts: number; // unix timestamp ms
	type: EventType;
	text?: string;
	path?: string; // for file_linked / file_unlinked
	reason?: string; // for file_linked
	author?: string; // 'user' | 'claude' | 'codex' | agent name
};

type FeatureMeta = {
	id: string;
	name: string;
	branch?: string;
	status: 'in-progress' | 'blocked' | 'done';
	createdAt: number;
	updatedAt: number;
};

type FeatureContext = {
	meta: FeatureMeta;
	files: Array<{ path: string; reason?: string }>;
	decisions: Array<{ text: string; ts: number; author?: string }>;
	blockers: Array<{ text: string; resolved: boolean; ts: number }>;
	notes: Array<{ text: string; ts: number }>;
	currentStatus?: string;
};
```

**Done when:** file compiles without errors.

---

### T006 — FeatStore: events.jsonl read/write

- [x] Create `src/core/feat/store.ts`
- [x] `appendEvent(projectId, featName, event)`: appends to events.jsonl + regenerates context.md
- [x] `readEvents(projectId, featName)`: reads and parses events.jsonl
- [x] `buildContext(events)`: reduces events into `FeatureContext`
- [x] `listFeats(projectId)`: lists all features for a project
- [x] `featExists(projectId, featName)`: boolean
- [x] Write tests: `tests/core/feat/store.test.ts`

**Done when:** append and read work; `buildContext` returns correct state for a test event sequence.

---

### T007 — Renderer: generate context.md

- [x] Create `src/core/feat/renderer.ts`
- [x] `renderContext(context: FeatureContext): string`: generates formatted markdown
- [x] Sections: header, Relevant Files, Decisions, Current Status, Blockers, Notes
- [x] Resolved blockers appear in a separate "Resolved Blockers" section (omit section if none)
- [x] Write tests: `tests/core/feat/renderer.test.ts` with snapshots

**Done when:** `renderContext` output matches the example in `docs/ARCHITECTURE.md`.

---

### T008 — Active feat tracking

- [x] Create `src/core/feat/active.ts`
- [x] `getActiveFeat(projectId)`: reads `active_feat` file; returns `null` if not present
- [x] `setActiveFeat(projectId, featName)`: writes `active_feat` file
- [x] `clearActiveFeat(projectId)`: removes `active_feat` file
- [x] Write tests: `tests/core/feat/active.test.ts`

**Done when:** tests pass.

---

## Block 4 — CLI commands

### T009 — `mnemo init`

- [x] Implement in `src/commands/init.ts`
- [x] Create `~/.mnemo/projects/{id}/` structure via `ensurePaths()`
- [x] Write `meta.json` with project name and path
- [x] Install `post-commit` git hook in `.git/hooks/`
- [x] Idempotent: does not fail if already initialized
- [x] Output: confirmation with project ID and path

**Done when:** `mnemo init` runs without errors; `.git/hooks/post-commit` created; re-running is safe.

---

### T010 — `mnemo feat start <name>`

- [x] Validate project is initialized (`assertInitialized()`)
- [x] Create feat directory via `ensurePaths()`
- [x] Write initial `meta.json`
- [x] Append `feat_created` event
- [x] Set as active feat via `setActiveFeat()`
- [x] Auto-detect current branch via `simple-git` and save to meta if available
- [x] Output: confirmation with feat name and branch

**Done when:** `mnemo feat start payment-flow` creates the structure and sets it as active.

---

### T011 — `mnemo feat list`

- [x] List all feats for the project
- [x] Show: name, status, branch, last updated
- [x] Highlight active feat with visual indicator (`→` or `*`)
- [x] Show friendly empty message if no feats exist

**Done when:** lists feats with correct active indicator.

---

### T012 — `mnemo feat switch <name>`

- [x] Validate feat exists
- [x] Update `active_feat`
- [x] Output: confirmation

**Done when:** switch correctly changes the active feat.

---

### T013 — `mnemo feat context [name]`

- [x] No argument: uses active feat; error if none active
- [x] With argument: uses specified feat
- [x] Reads events.jsonl → `buildContext()` → `renderContext()` → stdout
- [x] Output is pure markdown (no extra decoration) — for agent consumption via pipe

**Done when:** `mnemo feat context | cat` prints clean markdown.

---

### T014 — `mnemo feat decision "<text>"`

- [x] Uses active feat or optional `--feat <name>`
- [x] Appends `decision` event with timestamp and `author: 'user'`
- [x] Regenerates `context.md`
- [x] Output: confirmation with truncated text

**Done when:** decision appears in `mnemo feat context`.

---

### T015 — `mnemo feat blocker "<text>"`

- [x] Appends `blocker` event
- [x] Regenerates `context.md`
- [x] Updates feat status to `blocked` if it was `in-progress`
- [x] Output: confirmation

**Done when:** blocker appears in the Blockers section of `mnemo feat context`.

---

### T016 — `mnemo feat blocker resolve "<text>"`

- [x] Match by substring against active blocker text
- [x] Appends `blocker_resolved` event
- [x] If no more active blockers, reverts status to `in-progress`
- [x] Regenerates `context.md`
- [x] Output: confirmation or error if no matching blocker found

**Done when:** blocker disappears from active Blockers section after resolve.

---

### T017 — `mnemo feat link-file <path> [--reason "<text>"]`

- [x] Validate file exists in the project (relative to CWD)
- [x] Normalize path to be relative to git repo root
- [x] Appends `file_linked` event
- [x] Regenerates `context.md`
- [x] Output: confirmation

**Done when:** file appears in Relevant Files in `mnemo feat context`.

---

### T018 — `mnemo feat unlink-file <path>`

- [x] Appends `file_unlinked` event
- [x] Regenerates `context.md`
- [x] Output: confirmation or warning if file was not linked

**Done when:** file disappears from Relevant Files after unlink.

---

### T019 — `mnemo feat status "<text>"`

- [x] Appends `status` event
- [x] Regenerates `context.md`
- [x] Output: confirmation

**Done when:** Current Status updated in `mnemo feat context`.

---

### T020 — `mnemo feat note "<text>"`

- [x] Appends `note` event
- [x] Regenerates `context.md`
- [x] Output: confirmation

**Done when:** note appears in the Notes section.

---

### T021 — `mnemo feat done`

- [x] Appends `feat_done` event
- [x] Updates `meta.json` status to `done`
- [x] Clears active feat if this was the active feat
- [x] Regenerates `context.md`
- [x] Output: confirmation

**Done when:** feat shows as `done` in `mnemo feat list`.

---

## Block 5 — Agent integration

### T022 — Claude Code Skill

- [x] Create `src/integrations/agents/claude.ts`
- [x] Generate skill file content for `~/.claude/skills/mnemo.md`
- [x] Skill exposes: `/mnemo-context`, `/mnemo-decision`, `/mnemo-blocker`, `/mnemo-note`
- [x] Each skill command runs the corresponding CLI command via shell and injects output

**Skill content:**

```markdown
# mnemo — codebase memory

Run `mnemo feat context` at the start of any session to load the current feature context.

## Commands

/mnemo-context — Load current feature context into this session
Runs: mnemo feat context

/mnemo-decision <text> — Record an architectural decision
Runs: mnemo feat decision "<text>"

/mnemo-blocker <text> — Record a blocker
Runs: mnemo feat blocker "<text>"

/mnemo-note <text> — Record a note
Runs: mnemo feat note "<text>"
```

**Done when:** skill file generated with correct content.

---

### T023 — `mnemo install claude`

- [x] Implement in `src/commands/install.ts`
- [x] Copy skill to `~/.claude/skills/mnemo.md`
- [x] Append Mnemo block to project's `CLAUDE.md` (create if not present)
- [x] Idempotent: does not duplicate if already installed
- [x] Output: list of created/updated files

**Block appended to project CLAUDE.md:**

```markdown
## Mnemo — Codebase Memory

This project uses Mnemo for persistent context across AI sessions.

At the start of each session:

1. Run `mnemo feat context` to load the current feature context
2. Use `mnemo search "<query>"` before exploring unfamiliar code (Phase 2)

When making architectural decisions, run:
`mnemo feat decision "<your decision and rationale>"`

When hitting a blocker:
`mnemo feat blocker "<description>"`
```

**Done when:** `mnemo install claude` creates skill and updates CLAUDE.md; re-running is safe.

---

## Block 6 — Polish and integration tests

### T024 — End-to-end integration tests

- [x] Create `tests/e2e/feat-flow.test.ts`
- [x] Test full flow: init → feat start → decision → blocker → resolve → context
- [x] Use a temporary directory for `~/.mnemo/` during tests
- [x] Clean up after each test

**Done when:** full flow passes in tests.

---

### T025 — Error handling and UX

- [x] Clear error messages for all common cases:
  - Project not initialized
  - Feat not found
  - No active feat
  - File not found for link
- [x] `mnemo --version` returns version from package.json
- [x] All commands have descriptive `--help`

**Done when:** every error has an actionable message (e.g. "Run `mnemo init` to initialize this project.").

---

## Progress summary

```
Block 1 — Setup:        T001 T002
Block 2 — Core infra:   T003 T004
Block 3 — FEAT store:   T005 T006 T007 T008
Block 4 — CLI commands: T009 T010 T011 T012 T013 T014 T015 T016 T017 T018 T019 T020 T021
Block 5 — Integration:  T022 T023
Block 6 — Polish:       T024 T025
```

**Total Phase 1: 25 tasks**

---

---

---

# Phase 2 — Semantic Index

**Goal:** Natural language search across the codebase via local embeddings. Zero infrastructure, works offline.  
**Done when:** `mnemo search "authentication logic"` returns ranked results in <500ms on a 100k LOC project.

---

## Block 7 — Config system

### T026 — `mnemo config get|set`
- [x] Implement `src/commands/config.ts`
- [x] Read/write `~/.mnemo/config.json`
- [x] `mnemo config set <key> <value>` — supports dot notation (`embedding.provider`, `vector-store`)
- [x] `mnemo config get <key>` — prints current value or default
- [x] `mnemo config list` — prints all settings with defaults
- [x] Write tests: `tests/commands/config.test.ts`

**Done when:** `mnemo config set embedding.provider ollama` persists and `mnemo config get embedding.provider` returns `ollama`.

---

## Block 8 — VectorStore abstraction

### T027 — VectorStore interface and types
- [x] Create `src/core/index/vector-store.ts`
- [x] Define `VectorStore` interface per `docs/ARCHITECTURE.md`
- [x] Define `Chunk` and `ScoredChunk` types:

```typescript
type Chunk = {
  id: string           // "{file_path}:{start_line}:{end_line}"
  filePath: string
  startLine: number
  endLine: number
  content: string
  fileHash: string     // XXH3
  indexedAt: number
}

type ScoredChunk = Chunk & { score: number }
```

**Done when:** interface compiles; types are exported from `src/types.ts`. ✓

---

### T028 — sqlite-vec backend
- [x] Install `sqlite-vec` package
- [x] Create `src/core/index/backends/sqlite-vec.ts` implementing `VectorStore`
- [x] `upsert`: bulk insert chunks + vectors in a single transaction
- [x] `query`: ANN search via `vec_distance_cosine`, return top-k with scores
- [x] `delete`: remove all chunks for a given file path prefix
- [x] `close`: close DB connection
- [x] Write tests: `tests/core/index/backends/sqlite-vec.test.ts`

**Done when:** upsert → query round-trip returns the inserted chunk as top result.

---

## Block 9 — Embedding pipeline

### T029 — Embedding provider interface
- [x] Create `src/core/index/embedder.ts`
- [x] Define `Embedder` interface: `embed(texts: string[]): Promise<number[][]>`
- [x] Implement ONNX provider (`src/core/index/providers/onnx.ts`) using `onnxruntime-node` + bundled `all-MiniLM-L6-v2` model (384 dimensions)
- [x] Implement Ollama provider (`src/core/index/providers/ollama.ts`) — HTTP call to local Ollama instance
- [x] Implement OpenAI provider (`src/core/index/providers/openai.ts`) — opt-in, requires API key in config
- [x] Provider factory: `createEmbedder(config)` — returns correct provider based on `embedding.provider` config; auto-detects Ollama if installed
- [x] Write tests for ONNX provider

**Done when:** `createEmbedder()` returns ONNX embedder by default; all three providers implement the interface.

---

### T030 — File chunker
- [x] Create `src/core/index/chunker.ts`
- [x] Primary: chunk by function/class boundaries using Tree-sitter (reuse parsers from Phase 3 if available, skip if not)
- [x] Fallback: fixed-token chunking (~200 tokens, 20-token overlap) when no parser available
- [x] Chunk ID format: `"{filePath}:{startLine}:{endLine}"`
- [x] Write tests with sample files

**Done when:** chunker returns non-overlapping chunks covering the full file content.

---

### T031 — Indexing pipeline with worker_threads
- [x] Create `src/core/index/pipeline.ts`
- [x] `indexFiles(filePaths: string[], projectId: string): Promise<IndexStats>` — main entry point
- [x] Partition files across `worker_threads` (N workers = CPU count - 1, min 1)
- [x] Each worker: chunk files → embed chunks → return results to main thread via `transferList`
- [x] Main thread: accumulate all results in memory → single `VectorStore.upsert()` call at end
- [x] Compute and store XXH3 hash per file
- [x] `IndexStats`: `{ filesIndexed, chunksCreated, durationMs }`
- [x] Write tests: `tests/core/index/pipeline.test.ts`

**Done when:** pipeline indexes a 10-file fixture in parallel; all chunks queryable after flush.

---

## Block 10 — Search command

### T032 — `mnemo update`
- [x] Implement `src/commands/update.ts`
- [x] `mnemo update` — full re-index of entire project (respects `.gitignore`)
- [x] `mnemo update --since <commit>` — re-index only files changed since commit
- [x] `mnemo update --files-from-stdin` — re-index files piped via stdin (used by git hook)
- [x] Show progress: files found, files indexed, duration
- [x] Update git hook in `mnemo init` to call `mnemo update --files-from-stdin`

**Done when:** `mnemo update` indexes a real project; incremental update works via git hook after a commit.

---

### T033 — Query-time freshness validation
- [x] In `VectorStore.query()`, after retrieving results, check `xxh3(file) == stored fileHash`
- [x] If stale: call `indexFiles([stalePath])` inline, then retry query
- [x] Stale re-index is transparent to the caller
- [x] Write tests: simulate a file change between index and query

**Done when:** modifying an indexed file and querying returns updated results without manual re-index.

---

### T034 — `mnemo search <query>`
- [x] Implement `src/commands/search.ts`
- [x] `mnemo search <query>` — embeds query, calls `VectorStore.query()`, prints results
- [x] Default: top 10 results
- [x] `--limit <n>` flag
- [x] `--output json` flag for machine-readable output
- [x] Output format: `file:startLine-endLine (score)` + snippet (first 2 lines of chunk)
- [x] Error if project not indexed: "Run `mnemo update` to index this project first."

**Done when:** `mnemo search "JWT authentication"` returns relevant files in <500ms on a 50k LOC project.

---

## Block 11 — mnemo status + agent integration update

### T035 — `mnemo status`
- [x] Implement in `src/commands/status.ts`
- [x] Show: project ID, total files indexed, total chunks, last indexed timestamp, embedding provider, vector store backend
- [x] Warn if index is older than 24h without a commit

**Done when:** `mnemo status` prints a readable health summary.

---

### T036 — Git hook auto-switch feat by branch
- [x] Update post-commit hook: after re-indexing, check if current branch matches any feat's `branch` field
- [x] If match found: auto-switch active feat to that feat
- [x] Print message if auto-switched: "Switched active feat to: {name}"

**Done when:** checking out a branch with a matching feat auto-activates it.

---

### T037 — Update agent integrations for Phase 2
- [x] Update `mnemo install claude`: add `/mnemo-search` to skill; add search instructions to CLAUDE.md block
- [x] Update `mnemo install codex/copilot/cursor` (if already implemented): same search instructions
- [x] Add search to `src/integrations/agents/claude.ts` skill content

**Done when:** skill includes `/mnemo-search <query>` that runs `mnemo search` and injects results.

---

---

# Phase 3 — Structural Graph + MCP + Agent Installers

**Goal:** File-level dependency graph, MCP server for non-CLI agents, and remaining agent installers.  
**Done when:** `mnemo graph deps <file>` works, `mnemo mcp serve` exposes all tools, and all four agent installers are implemented.

---

## Block 12 — Structural Graph

### T038 — Tree-sitter setup
- [x] Install `node-tree-sitter` and language grammars: `tree-sitter-typescript`, `tree-sitter-javascript`, `tree-sitter-python`, `tree-sitter-go`, `tree-sitter-rust`, `tree-sitter-java`
- [x] Create `src/core/graph/parser.ts` — `parseFile(filePath): ParsedFile`
- [x] Extract per file: imports, exports, top-level function names, top-level class names
- [x] Regex fallback for unsupported languages (import lines only)
- [x] Write tests with fixture files for each supported language

**Done when:** `parseFile("src/commands/feat.ts")` returns correct imports and exported symbols.

---

### T039 — Graph storage
- [x] Create `src/core/graph/store.ts`
- [x] SQLite schema per `docs/ARCHITECTURE.md` (nodes + edges tables)
- [x] `upsertFile(file: ParsedFile)`: insert/update nodes and edges for a file
- [x] `deleteFile(filePath)`: remove all nodes and edges for a file
- [x] `getDeps(filePath)`: files this file imports
- [x] `getRefs(filePath)`: files that import this file
- [x] `getAffected(filePath, maxDepth=3)`: transitive dependents (BFS)
- [x] `getSymbols(filePath)`: top-level function/class names
- [x] Write tests: `tests/core/graph/store.test.ts`

**Done when:** a chain A→B→C returns B and C as affected by A.

---

### T040 — Graph indexing pipeline
- [x] Create `src/core/graph/pipeline.ts`
- [x] `indexGraphFiles(filePaths, projectId)`: parse + upsert all files
- [x] Integrate with `mnemo update` — graph indexing runs alongside semantic indexing
- [x] Graph freshness: use same XXH3 hash stored in graph nodes

**Done when:** `mnemo update` populates both vector and graph indexes.

---

### T041 — Graph CLI commands
- [x] Implement `src/commands/graph.ts`
- [x] `mnemo graph deps <file>` — list files this file imports
- [x] `mnemo graph refs <file>` — list files that import this file
- [x] `mnemo graph affected <file>` — transitive dependents (max depth 3)
- [x] `mnemo graph symbols <file>` — list top-level functions/classes

**Done when:** all four commands return correct results on the mnemo project itself.

---

## Block 13 — Hybrid ranking

### T042 — Combine semantic + graph + feat scores
- [x] Update `mnemo search` to apply hybrid scoring after vector retrieval:

```
score =
  0.5 * semantic_similarity
+ 0.2 * graph_proximity      (inverse hop distance from feat-linked files)
+ 0.2 * feat_relevance       (file is in active feat's linked files)
+ 0.1 * recency              (recently modified files ranked higher)
```

- [x] Graph proximity: for each result, BFS from feat-linked files; score = 1 / (hops + 1)
- [x] Feat relevance: binary 1.0 if file is in active feat, 0 otherwise
- [x] Recency: normalize `mtime` across results
- [x] `--no-hybrid` flag to disable and use pure semantic ranking
- [x] Write tests comparing rankings with and without hybrid scoring

**Done when:** a file in the active feat ranks higher than an equally similar file outside the feat.

---

## Block 14 — MCP Server

### T043 — MCP server setup
- [x] Install `@modelcontextprotocol/sdk`
- [x] Create `src/integrations/mcp/server.ts`
- [x] Implement `mnemo mcp serve` command in `src/commands/mcp.ts`
- [x] Support stdio transport (default) and `--port <n>` for HTTP/SSE

**Done when:** `mnemo mcp serve` starts without errors and responds to MCP ping.

---

### T044 — MCP tools: FEAT cache
- [x] Expose as MCP tools: `get_feat_context`, `record_decision`, `record_blocker`, `resolve_blocker`, `link_file`
- [x] Each tool maps directly to the corresponding core function
- [x] Write integration test using MCP SDK client

**Done when:** an MCP client can call `get_feat_context` and receive the current feat's context.md.

---

### T045 — MCP tools: search and graph
- [x] Expose: `search_codebase(query, limit?)`, `get_deps(file)`, `get_refs(file)`, `get_symbols(file)`
- [x] `search_codebase` returns `ScoredChunk[]` as JSON

**Done when:** MCP client can call `search_codebase` and receive ranked results.

---

## Block 15 — Remaining agent installers

### T046 — `mnemo install codex`
- [x] Create `src/integrations/agents/codex.ts`
- [x] Generate/update `AGENTS.md` in project root
- [x] Include: feat context instructions, search instructions, decision recording

**Done when:** `AGENTS.md` created with correct Mnemo instructions; re-running is safe.

---

### T047 — `mnemo install copilot`
- [x] Create `src/integrations/agents/copilot.ts`
- [x] Generate/update `.github/copilot-instructions.md`
- [x] Same content pattern as AGENTS.md

**Done when:** `.github/copilot-instructions.md` updated correctly; idempotent.

---

### T048 — `mnemo install cursor`
- [x] Create `src/integrations/agents/cursor.ts`
- [x] Generate/update `.cursorrules`
- [x] Same content pattern

**Done when:** `.cursorrules` created correctly; idempotent.

---

## Block 16 — Polish Phase 3

### T049 — Obsidian export
- [x] `mnemo export obsidian [--output <dir>]` — exports all feat contexts as an Obsidian vault
- [x] One markdown file per feat, with wiki-links between related feats
- [x] Default output: `.mnemo-obsidian/` in project root

**Done when:** exported vault opens correctly in Obsidian with all feats visible.

---

### T050 — End-to-end tests Phase 2+3
- [x] `tests/e2e/search-flow.test.ts`: update → search → verify relevant results
- [x] `tests/e2e/graph-flow.test.ts`: update → graph deps/refs → verify correctness
- [x] `tests/e2e/mcp-flow.test.ts`: mcp serve → client calls → verify responses

**Done when:** all e2e tests pass on the mnemo project itself as the test subject.

---

## Updated progress summary

```
Phase 1 — FEAT Cache (complete):
  Block 1:  T001 T002
  Block 2:  T003 T004
  Block 3:  T005 T006 T007 T008
  Block 4:  T009 T010 T011 T012 T013 T014 T015 T016 T017 T018 T019 T020 T021
  Block 5:  T022 T023
  Block 6:  T024 T025

Phase 2 — Semantic Index:
  Block 7:  T026
  Block 8:  T027 T028
  Block 9:  T029 T030 T031
  Block 10: T032 T033 T034
  Block 11: T035 T036 T037

Phase 3 — Structural Graph + MCP:
  Block 12: T038 T039 T040 T041
  Block 13: T042
  Block 14: T043 T044 T045
  Block 15: T046 T047 T048
  Block 16: T049 T050
```

**Total: 50 tasks — ALL COMPLETE**
