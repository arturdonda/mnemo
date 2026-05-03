# Architectural Decisions

A running log of key decisions made during the design and development of Recall.
Format: decision → rationale → alternatives considered.

---

## 2026-04-25

### D001 — SQLite instead of PostgreSQL + pgvector

**Decision:** Use SQLite with sqlite-vec extension for vector storage.

**Rationale:** A CLI dev tool must have zero infrastructure requirements. Requiring a running PostgreSQL instance would be a significant adoption barrier. SQLite is embedded, requires no installation beyond the file itself, and works identically on Windows, macOS, and Linux.

**Alternatives considered:**

- PostgreSQL + pgvector: powerful but requires server process and installation
- ChromaDB: embedded mode works, but Python dependency complicates Node.js distribution
- LanceDB: good option, Continue.dev uses it; ruled out to avoid lock-in to their format
- Qdrant: embedded mode available in Rust only

**Trade-offs:** SQLite + sqlite-vec has a practical limit of ~2M vectors before performance degrades. This covers repos up to ~500k LOC comfortably. Larger repos would require chunking strategy or migration to a dedicated vector store. Acceptable for v1 target users.

---

### D002 — FEAT Cache as Phase 1 MVP, not Semantic Index

**Decision:** Build FEAT context cache first, before embeddings or graph.

**Rationale:** FEAT cache is the most differentiated feature — no existing tool does it. It requires minimal infrastructure (markdown + JSONL, no vector math), can be validated quickly, and directly solves the cross-session context loss problem. If this fails to add value, we avoid building the more complex layers.

**Alternatives considered:**

- Build semantic index first: higher technical complexity, solved by existing tools (Continue.dev)
- Build all three layers simultaneously: high risk, slow validation

---

### D003 — Local embedding model, not API

**Decision:** Bundle an ONNX embedding model, use API only as opt-in.

**Rationale:** Requiring an API key for indexing creates friction, cost, and internet dependency. A bundled small model (all-MiniLM-L6-v2, 22MB) works offline and has zero marginal cost per query. Code retrieval quality is adequate for file-level semantic search.

**Alternatives considered:**

- OpenAI text-embedding-3-small: best quality, but requires API key and internet
- Ollama (nomic-embed-text): excellent quality, but requires Ollama installed
- No bundled model, require Ollama: cleaner binary, but more setup friction

**Resolution:** Default to bundled ONNX. Auto-detect Ollama and use it if available (better quality). API embedding as explicit opt-in config.

---

### D004 — Node.js for initial implementation

**Decision:** Start with Node.js, not Rust.

**Rationale:** Faster iteration speed during MVP phase. Tree-sitter has excellent Node.js bindings. The npm ecosystem simplifies distribution. Performance bottlenecks (indexing throughput) can be addressed with worker threads or native addons if needed.

**Alternatives considered:**

- Rust: ideal long-term (single binary, fast, great Tree-sitter support via `tree-sitter` crate), but slower initial development
- Python: good ML/embedding ecosystem, but packaging for cross-platform CLI is painful
- Go: fast compilation, single binary, but weaker Tree-sitter bindings

**Revisit trigger:** If indexing a 100k LOC project takes >60s, evaluate Rust rewrite of the indexing pipeline.

---

### D005 — Git remote URL hash as project identity

**Decision:** Identify projects by `sha256(git remote URL)[0:16]`, fall back to `sha256(absolute path)`.

**Rationale:** Stable across directory renames/moves, consistent across team members (same remote = same project ID), no user configuration needed.

**Alternatives considered:**

- Project name from package.json/pyproject.toml: not universal, fragile
- User-assigned project name: requires configuration step
- Absolute path hash: breaks if project is moved or cloned to different location

---

### D006 — Append-only JSONL for decisions, derived markdown for context.md

**Decision:** Store decisions as append-only JSONL, generate `context.md` from it on demand (or on each append).

**Rationale:** JSONL is easy to write (no read-before-write), easy to parse, and git-diffable. `context.md` is the human+agent interface, but should be derived from the structured log to avoid drift. The markdown can be regenerated at any time from the JSONL.

**Alternatives considered:**

- Only markdown: easy to read but hard to query or re-derive structured info from
- Only database: loses human-readability and Obsidian compatibility
- Both maintained independently: risk of drift between the two representations

---

### D007 — Typed FEAT commands instead of free-form `feat note`

**Decision:** Provide typed commands (`feat decision`, `feat blocker`, `feat link-file`) as the primary interface. `feat note` exists but is secondary.

**Rationale:** Typed events produce structured data that agents can filter and consume precisely. A decision is semantically different from a blocker, which is different from a linked file. Typed events enable: filtering by type, resolving blockers, rendering sections separately in `context.md`, and future querying ("what decisions were made about auth?"). Free-form notes lose all of this.

**Alternatives considered:**

- Only free-form notes: simpler UX, but agents receive undifferentiated text
- SQLite table per type: over-engineered; JSONL with a `type` field is sufficient

---

### D008 — VectorStore as pluggable interface, sqlite-vec as MVP default

**Decision:** Abstract vector storage behind a `VectorStore` interface. Default to sqlite-vec in MVP. LanceDB available as opt-in via config.

**Rationale:** sqlite-vec is the right default for MVP — zero dependencies, single file, works on all platforms including Windows without native compilation issues. LanceDB offers better performance at scale and is a natural upgrade path. The abstraction ensures we can swap backends without changing query logic.

**Alternatives considered:**

- LanceDB as default: better performance, but more complex native deps; fragile on Windows in Node.js
- Only sqlite-vec: simpler, but paints into a corner for larger repos
- pgvector: requires Postgres server, violates zero-infra constraint

---

### D009 — `recall install <agent>` as first-class command

**Decision:** Provide agent-specific installer commands that generate or update the appropriate config file for each agent.

**Rationale:** Manual configuration per agent (editing CLAUDE.md, .cursorrules, AGENTS.md, copilot-instructions.md) is a significant adoption barrier. One command removes all friction. Idempotent — safe to re-run after Cross Context updates. Differentiates Cross Context from editor-specific tools by making cross-agent setup trivial.

**Alternatives considered:**

- Manual documentation only: friction causes drop-off
- Single universal config file: no such standard exists across all agents

---

### D010 — Node.js + TypeScript (confirmed)

**Decision:** Implement in Node.js with TypeScript.

**Rationale:** Fastest iteration for MVP. Strong Tree-sitter bindings (`node-tree-sitter`). npm distribution is straightforward (`npm install -g`). TypeScript provides type safety for the structured FEAT data model.

**Revisit trigger:** If full re-index of a 100k LOC project exceeds 60s, evaluate extracting the indexing pipeline as a Rust native addon.

---

### D011 — Product name: Cross Context, CLI command: `xctx`

**Decision:** Product name is **Cross Context**, CLI command is `xctx`, npm package is `cross-context`.

**Rationale:** "Recall" was the prior working name but was disqualified after research found an active open-source project (`camgitt/memoir`) doing essentially the same thing and positioning in the same namespace. "Cross Context" evokes mnemonic/memory, is short (5 chars), works as a CLI command (`xctx search`, `xctx feat`), has no active product conflicts at time of decision, and the npm `xctx` package is an abandoned 2014 stub.

**Alternatives considered and discarded:**

- Recall: active memoir/recall namespace conflict
- Memoir: `camgitt/memoir` is a direct competitor doing the same thing
- Memex: `memex.tech` and `memex.ai` are active funded products
- Memento: Memento Database is an active commercial product; npm `memento` is taken
- codeindexer: too generic, no product identity

---

### D012 — XXH3 for content hashing instead of SHA256

**Decision:** Use XXH3 (via `xxhash` npm package) for file content hashing, not SHA256.

**Rationale:** File hashing for change detection is a non-cryptographic use case — we only need to know if content changed, not to prevent collision attacks. XXH3 is ~10x faster than SHA256 on modern hardware and produces a 128-bit hash with negligible collision probability for this purpose. Speed matters here because every query spot-checks hashes of returned files. Adopted from codebase-memory-mcp which uses the same approach.

**Alternatives considered:**

- SHA256: cryptographically strong but ~10x slower; no security benefit for this use case
- MD5: faster than SHA256 but deprecated and has known collisions
- mtime only: fast but unreliable (file copies, git checkouts preserve mtime)

---

### D013 — In-memory indexing pipeline with single SQLite flush

**Decision:** Accumulate all indexing results in memory during a batch operation and flush to SQLite once at the end, rather than writing incrementally per file.

**Rationale:** Per-file SQLite writes during indexing create significant I/O overhead, especially on Windows where SQLite locking is slower. Accumulating in memory and doing one bulk insert eliminates this overhead. The tradeoff is higher peak memory usage, acceptable because: (a) indexing batches are bounded by changed files (typically small for incremental), (b) memory is released after the flush, and (c) Node.js handles 500MB+ without issues on modern machines. Pattern validated by codebase-memory-mcp's production use.

**Alternatives considered:**

- Write-as-you-go per file: simpler but slow at scale
- WAL mode + batch transactions: better than per-file, but still more complex than full in-memory accumulation

---

### D014 — Node.js worker_threads for parallel indexing

**Decision:** Use Node.js `worker_threads` to parallelize file parsing and embedding during index builds.

**Rationale:** Indexing is CPU-bound (Tree-sitter parsing + ONNX inference). Node.js single-threaded event loop would serialize all of this. `worker_threads` provides true parallelism without spawning separate processes, avoiding the IPC overhead of child processes. Each worker handles a partition of files; results are sent back to the main thread via `transferList` (zero-copy ArrayBuffer transfer for embedding vectors).

**Alternatives considered:**

- child_process / cluster: higher IPC overhead, more complex lifecycle
- Sequential processing: simple but slow on large repos
- Rust native addon for indexing: better performance ceiling but complexity cost; revisit if 60s threshold is exceeded

---

### D015 — Adaptive polling for file watcher

**Decision:** Use chokidar with adaptive polling — interval starts low on activity, increases exponentially during idle periods, resets on detected changes.

**Rationale:** A fixed-interval file watcher unnecessarily consumes CPU when a developer is not actively coding (reading docs, in meetings, etc.). Adaptive polling reduces to near-zero overhead during idle periods while remaining responsive when files change. This is the approach used by codebase-memory-mcp's background watcher.

**Alternatives considered:**

- Fixed interval polling: simpler but wastes CPU when idle
- Native OS events only (inotify/FSEvents/ReadDirectoryChangesW): more efficient but chokidar already handles cross-OS abstraction with fallback to polling
- No file watcher (hooks only): covered by D002 rationale; watcher is opt-in anyway

---

### D016 — Layer 2 (Structural Graph): Implement from scratch (Option A)

**Decision:** Implement the structural graph layer using Tree-sitter directly, rather than delegating to codebase-memory-mcp as a backend.

**Rationale:** codebase-memory-mcp is an MCP server — integrating it as a backend would require running a separate process and communicating via MCP protocol, adding latency and a hard external dependency. Cross Context's unified CLI and offline-first model require owning the graph layer. Additionally, full control over the graph schema allows tight integration with the FEAT cache (e.g., knowing which graph nodes are in scope for a feature). The trade-off is implementation time, accepted because the MVP scope for Layer 2 is deliberately minimal (imports, exports, symbol names only — no full call graphs).

**Alternatives considered:**

- Option B (integrate codebase-memory-mcp): faster time to market but runtime dependency, MCP IPC overhead, and loss of graph/FEAT integration
- LSP-based approach: more accurate type resolution but requires language server per language — too heavy for MVP

---

### D017 — en-US as the only language for all project artifacts

**Decision:** All code, comments, documentation, commit messages, error messages, and CLI output must be written in en-US.

**Rationale:** Cross Context is an open source product targeting an international developer audience. Mixed-language projects create friction for contributors, make automated tooling less reliable, and reduce discoverability. en-US is the de-facto standard for developer tooling globally.

**Scope:** Source code, comments, all docs (README, PRD, ARCHITECTURE, DECISIONS, STACK, TASKS, CLAUDE.md), CLI help text, error messages, commit messages.

**Alternatives considered:**

- Portuguese for internal docs only: creates two-tier documentation that diverges over time
- No enforcement: leads to gradual language mixing as the project grows
