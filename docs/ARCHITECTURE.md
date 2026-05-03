# Architecture

## Overview

Cross Context is a local CLI tool with three independently functional layers. Each layer can be used in isolation; they complement each other when combined.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Agent / Developer                        │
├──────────────┬──────────────────┬───────────────────────────────┤
│  Claude Code │   MCP Clients    │        Raw CLI                │
│    Skill     │ (Cursor, Copilot)│   (any terminal/agent)        │
├──────────────┴──────────────────┴───────────────────────────────┤
│                          Cross Context CLI                              │
│                    (unified interface)                          │
├────────────────┬────────────────┬───────────────────────────────┤
│  FEAT Cache    │ Semantic Index │    Structural Graph           │
│  (Layer 3)     │   (Layer 1)    │      (Layer 2)                │
│  markdown +    │  VectorStore   │     tree-sitter               │
│  JSONL         │  (pluggable)   │      SQLite                   │
└────────────────┴────────────────┴───────────────────────────────┘
                              │
                    ~/.xctx/projects/{id}/
```

---

## Layer 1: Semantic Index

### Purpose

Answer natural-language queries about the codebase without knowing file names or symbol names.

```
Query: "where is JWT authentication handled?"
→ Returns: [src/middleware/auth.ts, src/services/token.ts, ...]
```

**Why this layer exists:** Published benchmarks (arxiv 2603.27277) show that pure structural/graph retrieval achieves 83% answer quality vs. 92% for file-exploration agents. The 9% gap is precisely semantic queries — questions about concepts, behavior, or intent where the symbol name is unknown. This layer closes that gap.

### VectorStore Abstraction

The vector backend is pluggable. All layers interact with a common interface:

```typescript
interface VectorStore {
	upsert(chunks: Chunk[]): Promise<void>;
	query(embedding: number[], topK: number): Promise<ScoredChunk[]>;
	delete(filePathPrefix: string): Promise<void>;
	close(): Promise<void>;
}
```

Implementations:

| Backend    | Config value | Status        | Notes                                      |
| ---------- | ------------ | ------------- | ------------------------------------------ |
| sqlite-vec | `sqlite`     | Default (MVP) | Zero deps, single file, good for <500k LOC |
| LanceDB    | `lancedb`    | Phase 2       | Better perf at scale, local embedded       |
| pgvector   | `pgvector`   | Optional      | For teams with existing Postgres           |

Switch with:

```bash
xctx config set vector-store lancedb
```

### Embedding Pipeline

```
source file
  → chunk by function/class boundaries (Tree-sitter)
    → fallback to fixed-token chunks if no parser
  → embed each chunk (configurable provider) — via worker_threads pool
  → accumulate in-memory (no incremental I/O)

[end of batch]
  → single SQLite flush (all chunks + vectors at once)
  → store XXH3 content hash per file
```

Indexing runs in parallel via Node.js `worker_threads`. Each worker handles an independent file partition; results accumulate in memory and are flushed to SQLite in one write at the end. This avoids per-file I/O overhead and mirrors the pipeline architecture of codebase-memory-mcp.

**Embedding providers** (in priority order):

| Provider     | Config value | Quality | Cost | Requires          |
| ------------ | ------------ | ------- | ---- | ----------------- |
| ONNX bundled | `onnx`       | Good    | Free | Nothing (default) |
| Ollama       | `ollama`     | Better  | Free | Ollama installed  |
| OpenAI API   | `openai`     | Best    | Paid | API key           |

```bash
xctx config set embedding.provider onnx          # default
xctx config set embedding.provider ollama
xctx config set embedding.model nomic-embed-text
xctx config set embedding.provider openai
xctx config set embedding.model text-embedding-3-small
```

Default bundled model: `all-MiniLM-L6-v2` (22MB ONNX, 384 dimensions). No internet, no API cost.

**Storage schema** (sqlite-vec backend)

```sql
CREATE TABLE chunks (
  id         TEXT PRIMARY KEY,
  file_path  TEXT NOT NULL,
  start_line INTEGER,
  end_line   INTEGER,
  content    TEXT,
  file_hash  TEXT,
  indexed_at INTEGER
);

CREATE VIRTUAL TABLE chunk_vectors USING vec0(
  chunk_id  TEXT,
  embedding FLOAT[384]
);
```

**Query flow**

```
user query string
  → embed query (same model as index)
  → VectorStore.query(embedding, topK)
  → for each result: xxh3(file) == stored hash?
    → if stale: re-index inline, retry
  → return ranked results (file path + line range + snippet)
```

### Freshness

- Each chunk stores an **XXH3** content hash at index time (non-cryptographic, ~10x faster than SHA256 — sufficient for change detection)
- On query: spot-check XXH3 hash of returned files (microseconds per file)
- Stale files re-indexed inline before returning results
- Full re-index on git commit via hooks

---

## Layer 2: Structural Graph

### Purpose

Answer dependency and reference questions without reading files.

```
deps(UserService)  → [DatabasePool, CacheService, EmailAdapter]
refs(validateJWT)  → [middleware/auth.ts:34, routes/api.ts:12]
```

### MVP Scope

Phase 3 only extracts what is needed for file-level navigation. Full call graphs and semantic analysis are explicitly out of scope for v1.

**Extracted in MVP:**

- File imports and exports
- Top-level function and class names
- File-to-file dependency edges

**Explicitly excluded from MVP:**

- Function call graphs
- Type hierarchy (extends/implements)
- Deep semantic analysis

### Components

**Parser:** Tree-sitter with grammars for TypeScript, JavaScript, Python, Go, Rust, Java, C#. Regex fallback for unsupported languages (extracts imports only).

**Graph schema**

```sql
-- graph.db (separate SQLite file)
CREATE TABLE nodes (
  id        TEXT PRIMARY KEY,  -- "{file}" or "{file}::{symbol}"
  type      TEXT,              -- file | class | function
  file_path TEXT,
  name      TEXT,
  start_line INTEGER,
  end_line   INTEGER,
  file_hash  TEXT
);

CREATE TABLE edges (
  from_id   TEXT,
  to_id     TEXT,
  type      TEXT,   -- imports | exports
  PRIMARY KEY (from_id, to_id, type)
);

CREATE INDEX idx_edges_from ON edges(from_id);
CREATE INDEX idx_edges_to   ON edges(to_id);
```

**Query operations (MVP)**

```
deps(file)          → files this file imports
refs(file)          → files that import this file
affected(file)      → transitive dependents (breadth-first, max depth 3)
symbols(file)       → top-level function/class names in file
```

---

## Layer 3: FEAT Context Cache

### Purpose

Persist the context of a feature across sessions. This is the most differentiated layer — no existing tool does this well.

The key insight: feature work spans multiple sessions. Decisions made, files scoped, blockers noted — all of this disappears between conversations. FEAT cache makes it persistent.

### TypeScript Interface

```typescript
interface FeatureContext {
	id: string;
	name: string;
	branch?: string;
	status: 'in-progress' | 'blocked' | 'done';
	files: LinkedFile[];
	decisions: Decision[];
	blockers: Blocker[];
	notes: Note[];
	relatedFeatures: string[];
	createdAt: Date;
	updatedAt: Date;
}

interface LinkedFile {
	path: string;
	reason?: string; // why this file is relevant
	addedAt: Date;
}

interface Decision {
	text: string;
	author: string; // 'user' | 'claude' | 'codex' | etc.
	ts: Date;
}

interface Blocker {
	text: string;
	resolved: boolean;
	ts: Date;
}
```

### Storage Layout

```
~/.xctx/projects/{project-id}/feats/{feat-name}/
  context.md        ← auto-generated, read by agents at session start
  events.jsonl      ← append-only event log (source of truth)
  meta.json         ← id, name, branch, status, timestamps
```

`context.md` is derived from `events.jsonl` and regenerated on every write. Never edit `context.md` directly — it will be overwritten.

**events.jsonl** (source of truth)

```jsonl
{"ts":1745712000,"type":"decision","text":"Using Stripe Checkout, not Payment Intents","author":"claude"}
{"ts":1745712100,"type":"file_linked","path":"src/routes/payments.ts","reason":"main route handler"}
{"ts":1745712200,"type":"file_linked","path":"src/services/stripe.ts"}
{"ts":1745800000,"type":"blocker","text":"Stripe webhook signature validation failing in test env"}
{"ts":1745884800,"type":"status","text":"Webhook handler implemented, writing tests"}
{"ts":1745884900,"type":"blocker_resolved","text":"Stripe webhook signature validation failing in test env"}
```

**context.md** (auto-generated from events)

```markdown
# FEAT: payment-integration

**Branch:** feature/payment-integration
**Status:** in-progress
**Started:** 2026-04-20 | **Last updated:** 2026-04-25

## Relevant Files

- `src/routes/payments.ts` — main route handler
- `src/services/stripe.ts`
- `src/models/order.ts`

## Decisions

- 2026-04-20: Using Stripe Checkout, not Payment Intents — simpler for MVP scope
- 2026-04-22: Orders stay in PENDING until Stripe webhook confirms payment
- 2026-04-24: Webhook at /api/webhooks/stripe, verified via Stripe-Signature header

## Current Status

Webhook handler implemented, writing tests.

## Blockers

None active.

## Notes

- 2026-04-23: Stripe test mode uses different webhook secret than prod
```

### CLI Commands

**Typed commands produce structured events — avoid free-form `note` as default:**

```bash
xctx feat start <name> [--branch <branch>]
xctx feat list
xctx feat switch <name>
xctx feat context [<name>]          # dumps context.md to stdout

# Typed writes (preferred)
xctx feat decision "<text>"         # records architectural decision
xctx feat blocker "<text>"          # records a blocker
xctx feat blocker resolve "<text>"  # resolves a blocker
xctx feat link-file <path> [--reason "<why>"]
xctx feat unlink-file <path>
xctx feat status "<text>"           # updates current status

# Free-form (for anything that doesn't fit above)
xctx feat note "<text>"

xctx feat done                      # marks feat as completed
```

**Active feat**: stored in `~/.xctx/projects/{id}/active_feat`. Git hook auto-switches based on branch name if a feat with matching branch exists.

---

## Hybrid Ranking (Phase 2+)

Once both semantic index and structural graph are available, query results will use a combined score:

```
score =
  α * semantic_similarity      (cosine similarity from embeddings)
+ β * graph_proximity          (hop distance from feat-linked files)
+ γ * feat_relevance           (file is in current feat's files.txt)
+ δ * recency                  (recently modified files ranked higher)
```

Weights are configurable. Default: α=0.5, β=0.2, γ=0.2, δ=0.1.

This is the key insight that makes Recall more useful than pure RAG: results that are semantically similar _and_ close to your current work _and_ in your current feature scope rank far higher than semantically similar results in unrelated modules.

---

## Agent Installer

`xctx install <agent>` writes or updates the agent-specific config file that instructs the agent to use Recall.

| Command                 | Output file                               | What it adds                                                 |
| ----------------------- | ----------------------------------------- | ------------------------------------------------------------ |
| `xctx install claude`  | `CLAUDE.md` + `~/.claude/skills/xctx.md` | Context injection instructions + Skill                       |
| `xctx install codex`   | `AGENTS.md`                               | Instructions to call `xctx feat context` and `xctx search` |
| `xctx install copilot` | `.github/copilot-instructions.md`         | Same as AGENTS.md pattern                                    |
| `xctx install cursor`  | `.cursorrules`                            | Same pattern                                                 |

All generated files include:

1. Instructions to run `xctx feat context` at session start
2. Instructions to use `xctx search` before exploring unfamiliar code
3. Instructions to record decisions with `xctx feat decision`

Each `xctx install` command is idempotent — safe to re-run after updates.

---

## Update & Freshness Strategy

```
1. git post-commit hook (installed by xctx init)
   → git diff --name-only HEAD~1 HEAD
   → re-index only changed files (semantic + graph)
   → auto-switch active feat if branch matches

2. Query-time hash validation (always on)
   → sha256 check on every file in results
   → stale files re-indexed inline before returning

3. xctx update (manual)
   → full re-index of entire project
   → use after large merges or first clone

4. File watcher (opt-in)
   → xctx config set watch true
   → chokidar with adaptive polling (interval increases when no changes detected, resets on activity)
   → 3s debounce before triggering re-index
```

**Git hook** (`.git/hooks/post-commit`):

```bash
#!/bin/sh
changed=$(git diff --name-only HEAD~1 HEAD 2>/dev/null)
if [ -n "$changed" ]; then
  echo "$changed" | xctx update --files-from-stdin --silent
fi
```

---

## CLI Interface

```bash
# Global
xctx init
xctx update [--since <commit>] [--files-from-stdin]
xctx status
xctx config [get|set] <key> [<value>]
xctx install <claude|codex|copilot|cursor>

# Search
xctx search <query> [--limit 10] [--output json]
xctx search <query> --type graph

# Graph
xctx graph deps <file-or-symbol>
xctx graph refs <file-or-symbol>
xctx graph affected <file>
xctx graph symbols <file>

# FEAT
xctx feat start <name> [--branch <branch>]
xctx feat list
xctx feat switch <name>
xctx feat context [<name>]
xctx feat decision "<text>"
xctx feat blocker "<text>"
xctx feat blocker resolve "<text>"
xctx feat link-file <path> [--reason "<text>"]
xctx feat unlink-file <path>
xctx feat status "<text>"
xctx feat note "<text>"
xctx feat done
```

---

## MCP Server

```bash
xctx mcp serve    # stdio transport (default)
xctx mcp serve --port 3333   # HTTP/SSE transport
```

Exposes MCP tools:

```
search_codebase(query, limit?)        → ScoredChunk[]
get_feat_context(feat_name?)          → string (markdown)
record_decision(text, feat_name?)     → void
record_blocker(text, feat_name?)      → void
resolve_blocker(text, feat_name?)     → void
link_file(path, reason?, feat_name?)  → void
get_deps(file_or_symbol)              → string[]
get_refs(file_or_symbol)              → string[]
```

---

## Project Identity

```
project_id = sha256(git remote get-url origin || realpath(.))[0:16]
```

Stable across directory renames if git remote exists. Consistent across team members on the same repo.

---

## Technology Decisions

| Component         | Choice                                       | Rationale                                                                               |
| ----------------- | -------------------------------------------- | --------------------------------------------------------------------------------------- |
| Runtime           | Node.js + TypeScript                         | Fast iteration, good Tree-sitter bindings. Revisit Rust if indexing perf is bottleneck. |
| Vector storage    | sqlite-vec (default), LanceDB (opt-in)       | sqlite-vec: zero deps, MVP. LanceDB: better at scale. Interface abstracts both.         |
| Graph storage     | SQLite                                       | Same file store, no extra process                                                       |
| Embedding default | ONNX bundled (`all-MiniLM-L6-v2`)            | Offline, free, 22MB, good baseline quality                                              |
| Embedding alt     | Ollama (`nomic-embed-text`)                  | Better quality for code, auto-detected if installed                                     |
| Parser            | Tree-sitter                                  | 40+ languages, used by GitHub/Neovim/Helix                                              |
| Content hashing   | XXH3                                         | Non-cryptographic, ~10x faster than SHA256. Sufficient for change detection.            |
| Indexing pipeline | In-memory accumulation + single SQLite flush | Avoids per-file I/O overhead. Pattern proven by codebase-memory-mcp.                    |
| Parallelism       | Node.js `worker_threads`                     | Parallel file parsing/embedding without native deps                                     |
| File watcher      | chokidar + adaptive polling                  | Reduces CPU on idle repos; responsive on activity                                       |
| Config format     | JSON                                         | Simple, universally readable                                                            |
| FEAT storage      | events.jsonl + derived context.md            | Append-only (safe), human-readable, agent-consumable                                    |
| Global data dir   | `~/.xctx/`                                  | Mirrors pattern of `~/.npm`, `~/.cargo`                                                 |
