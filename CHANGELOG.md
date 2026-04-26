# Changelog

All notable changes to Mnemo are documented here.  
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)  
Versioning: [Semantic Versioning](https://semver.org/)

---

## [Unreleased]

### Added
- LanceDB backend as alternative vector store (`mnemo config set vector-store lancedb`)
- `mnemo models list/download/remove` for managing embedding models
- `mnemo doctor` for diagnosing setup issues
- `mnemo export obsidian` for Obsidian vault export
- `mnemo mcp serve` MCP server with FEAT cache and search tools
- `mnemo graph deps/refs/affected/symbols` structural dependency graph
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

[Unreleased]: https://github.com/arturdonda/mnemo/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/arturdonda/mnemo/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/arturdonda/mnemo/releases/tag/v0.1.0
