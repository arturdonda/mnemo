# Changelog

All notable changes to Mnemo are documented here.  
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)  
Versioning: [Semantic Versioning](https://semver.org/)

---

## [Unreleased]

---

## [1.4.1] — 2026-04-30

### Fixed
- `mnemo update` no longer stalls ~30s before graph progress bar appears — `detectProjectRoot` (git subprocess) is now called once at startup and shared with both phases instead of being re-invoked inside `indexGraphFiles`

---

## [1.4.0] — 2026-04-30

### Added
- `mnemo update` now performs incremental indexing by default for both semantic and graph phases — hashes all files with xxh3, skips unchanged files, and prunes deleted files automatically. A full re-index of NestJS (2002 files, ~7 min) now completes in seconds when few files changed.
- Semantic index shows diff summary before indexing: `45 changed, 1957 unchanged` or `Semantic index is up to date (N unchanged)`
- Graph index also shows: `Graph: 45 indexed, 1957 unchanged` or `Graph index is up to date (N unchanged)`
- Deleted files are automatically pruned from both indexes

### Changed
- `--since <commit>` and `--files-from-stdin` skip the hash diff (caller already provides the filtered list)
- LanceDB users fall back to full re-index for the semantic phase (no cheap hash lookup available in LanceDB)
- Phase labels renamed: `Indexing graph` → `Graph indexing` (consistent with `Semantic indexing`)

---

## [1.3.2] — 2026-04-30

### Fixed
- `mnemo update` progress bar now advances at the real rate — workers previously emitted progress after chunking (fast) and then stalled during the embedding batch; now each file is embedded immediately after chunking so the bar reflects true chunk+embed cost per file
- `mnemo update` no longer hangs silently after the bar reaches 100% — a `Saving N chunks...` message is shown while the vector store upsert runs
- Graph indexing now has its own real-time progress bar instead of running silently to completion

### Changed
- Semantic indexing and graph indexing now run sequentially (was parallel) so each phase has its own labeled progress bar
- First phase label changed from `Indexing` to `Semantic indexing` to distinguish it from graph indexing

---

## [1.3.1] — 2026-04-30

### Fixed
- Removed deprecated `boolean@3.2.0` transitive dependency by upgrading `onnxruntime-node` from `1.24.3` to `1.25.1` (which migrated `global-agent` to v4)

---

## [1.3.0] — 2026-04-30

### Added
- MCP server auto-registered for all agents on install — Cursor (`.cursor/mcp.json`), Windsurf (`~/.codeium/windsurf/mcp_config.json`), GitHub Copilot (`.vscode/mcp.json`), and OpenAI Codex (`~/.codex/config.toml`) now all get MCP configured out of the box, matching Claude Code's existing behavior
- All agent always-on instructions (`MNEMO_AGENT_BLOCK`) now include an MCP tools reference table so every agent knows to prefer MCP over CLI

### Changed
- `mnemo install cursor` now also creates `.cursor/mcp.json` with the mnemo MCP server entry
- `mnemo install windsurf` now also writes `~/.codeium/windsurf/mcp_config.json`
- `mnemo install copilot` now also creates `.vscode/mcp.json` (VS Code Copilot Agent mode uses `"servers"` root key with `type: "stdio"`)
- `mnemo install codex` now also writes `~/.codex/config.toml` with a `[mcp_servers.mnemo]` TOML section

---

## [1.2.0] — 2026-04-30

### Added
- `mnemo feat suggest-files [--limit n]` — suggests files to link based on the current feature context (status + recent decisions), with test/sample penalty applied
- `mnemo feat context --no-suggest` — suppresses the file suggestions block, useful when piping context to another tool
- `mnemo search --include-tests` — disables the test/sample score penalty to show all results ranked by pure semantic similarity
- `mnemo install claude` now registers the MCP server in `~/.claude/settings.json` automatically — agents use `get_feat_context`, `search_codebase`, and other MCP tools without shell permissions
- `mnemo doctor` reports graph index health with edge count (e.g. `✓ Graph index (4,046 edges)`)
- `mnemo update` shows a real-time progress bar in TTY: `[=====>    ] 40% (800/2002 files)`

### Fixed
- `mnemo graph refs <file>` and `mnemo graph affected <file>` always returned empty results — imports were stored as raw relative strings (`./compiler`) instead of project-relative paths, so cross-file lookups never matched. Graph now normalizes all node IDs and edge targets to project-relative forward-slash paths at index time.
- `mnemo graph deps <file>` returned raw import strings instead of resolved file paths.

### Changed
- `mnemo search` scores now display as `0.87` instead of `87.0%` — consistent with the README examples and more natural for agents.
- `mnemo search` snippets increased from 2 lines / 120 chars to 6 lines / 300 chars — enough context for an agent to judge relevance without opening the file.
- `mnemo search` applies a score penalty to test (`×0.60`) and sample (`×0.50`) files by default, so source-file results rank above equally-similar test fixtures. Override with `--include-tests`.
- `mnemo install claude` CLAUDE.md block now documents MCP tools alongside CLI commands, with MCP listed as the preferred approach.

---

## [1.1.0] — 2026-04-28

### Added
- Windsurf agent support: `mnemo install windsurf` writes `.windsurfrules` + `.windsurf/skills/mnemo/SKILL.md`
- Cross-agent `SKILL.md` standard: all agents now receive an invokable skill file alongside their always-on instructions (`.github/skills/`, `.cursor/skills/`, `.agents/skills/`, `.windsurf/skills/`)
- Model download shows real-time animated progress bar in TTY (150ms throttle) and periodic log lines in non-TTY

### Fixed
- Model downloaded N times in parallel (once per worker thread) on first `mnemo update` — now downloaded once in the main thread before workers start
- `mnemo graph` commands returned no results on Windows — `path.resolve()` returns backslashes but fast-glob stores forward slashes in the DB
- Search results could show negative scores (`-12%`) when cosine distance > 1 — scores are now clamped to zero

---

## [1.0.0] — 2026-04-26

First public release.

### Added
- LanceDB backend as alternative vector store (`mnemo config set vector-store lancedb`)
- `mnemo models list/download/remove` for managing embedding models
- `mnemo doctor` for diagnosing setup issues with fix instructions
- `mnemo export obsidian` for exporting all feats as an Obsidian vault
- `mnemo mcp serve` MCP server (stdio + HTTP/SSE) with FEAT cache and search tools
- `mnemo graph deps/refs/affected/symbols` structural dependency graph via Tree-sitter
- `mnemo install codex/copilot/cursor` agent integrations
- Hybrid search ranking (semantic + graph proximity + feat relevance + recency)
- Model download with progress bar and SHA256 integrity verification
- GitHub Actions CI matrix (ubuntu, macOS, Windows)
- Performance benchmarks (indexing and search latency)

---

## [0.2.0] — Phase 2+3 complete

### Added
- Semantic index: local ONNX embeddings via `all-MiniLM-L6-v2`
- `mnemo update` — indexes codebase with parallel worker threads
- `mnemo search "<query>"` — natural language search with freshness checks
- `mnemo status` — shows index stats
- Ollama and OpenAI embedding providers
- Structural graph: file-level dependency extraction (TypeScript, Python, Go, Rust, Java, C#)
- SQLite-backed graph store with BFS `getAffected`
- Git hook auto-switches active feat on branch checkout
- `mnemo install claude` updated with `/mnemo-search` skill

---

## [0.1.0] — Phase 1 complete

### Added
- `mnemo init` — initializes project, installs git hook
- `mnemo feat start/list/switch/context/done` — feature lifecycle
- `mnemo feat decision/blocker/note/status` — event recording
- `mnemo feat link-file/unlink-file` — file scoping
- `mnemo feat blocker resolve` — blocker resolution
- `mnemo install claude` — Claude Code skill integration
- `mnemo config get/set/list` — configuration management
- Append-only `events.jsonl` event sourcing
- `context.md` regenerated on every write
- XXH3-based project identity (stable across machines with same remote)

---

[Unreleased]: https://github.com/arturdonda/mnemo/compare/v1.4.1...HEAD
[1.4.1]: https://github.com/arturdonda/mnemo/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/arturdonda/mnemo/compare/v1.3.2...v1.4.0
[1.3.2]: https://github.com/arturdonda/mnemo/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/arturdonda/mnemo/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/arturdonda/mnemo/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/arturdonda/mnemo/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/arturdonda/mnemo/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/arturdonda/mnemo/compare/v0.2.0...v1.0.0
[0.2.0]: https://github.com/arturdonda/mnemo/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/arturdonda/mnemo/releases/tag/v0.1.0
