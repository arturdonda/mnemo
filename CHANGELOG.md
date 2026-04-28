# Changelog

All notable changes to Mnemo are documented here.  
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)  
Versioning: [Semantic Versioning](https://semver.org/)

---

## [Unreleased]

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

[Unreleased]: https://github.com/arturdonda/mnemo/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/arturdonda/mnemo/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/arturdonda/mnemo/compare/v0.2.0...v1.0.0
[0.2.0]: https://github.com/arturdonda/mnemo/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/arturdonda/mnemo/releases/tag/v0.1.0
