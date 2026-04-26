# Mnemo

> Your codebase, remembered — across every AI session.

[![CI](https://github.com/arturdonda/mnemo/actions/workflows/ci.yml/badge.svg)](https://github.com/arturdonda/mnemo/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/mnemo-cli)](https://www.npmjs.com/package/mnemo-cli)

**Mnemo** is a CLI tool that gives AI coding agents (Claude Code, GitHub Copilot, Codex, Cursor, and others) persistent memory of your codebase. Agents stop re-discovering your project from scratch on every session and start where they left off.

---

## The Problem

Every time you start a new AI coding session, the agent starts blind. It spends the first exchanges mapping your project — reading directory trees, tracing imports, re-reading files it already read yesterday. On a medium-sized codebase, this costs 2,000–8,000 tokens before any real work begins.

Worse: every feature conversation resets. Decisions made last session ("we chose Stripe Checkout because..."), files scoped in, blockers noted — all gone.

## The Solution

Mnemo maintains three complementary indexes, updated automatically via git hooks:

| Layer | What it stores | Query |
|---|---|---|
| **FEAT Cache** | Per-feature decisions, files, blockers, notes | `mnemo feat context` |
| **Semantic Index** | Local vector embeddings of every source file | `mnemo search "<query>"` |
| **Structural Graph** | File-level dependency graph | `mnemo graph deps <file>` |

---

## Installation

```bash
npm install -g mnemo-cli
```

Requires Node.js ≥ 20.

---

## Quick Start

```bash
# 1. Initialize Mnemo in your project
mnemo init

# 2. Index the codebase (downloads ONNX model on first run, ~88MB)
mnemo update

# 3. Start tracking a feature
mnemo feat start payment-flow

# 4. Wire up your AI agent
mnemo install claude     # Claude Code
mnemo install codex      # OpenAI Codex / ChatGPT
mnemo install copilot    # GitHub Copilot
mnemo install cursor     # Cursor
```

---

## Command Reference

### Project

```
mnemo init              Initialize Mnemo for this project
mnemo update            Index or re-index the codebase
  --since <commit>      Only re-index files changed since this commit
  --files-from-stdin    Read file list from stdin (used by git hook)
mnemo doctor            Diagnose setup issues with fix instructions
mnemo status            Show index stats (files, chunks, last indexed)
```

### Feature Context

```
mnemo feat start <name>              Start a new feature context
mnemo feat list                      List all features
mnemo feat switch <name>             Switch active feature
mnemo feat context [name]            Print current feature context (markdown)
mnemo feat decision "<text>"         Record an architectural decision
mnemo feat blocker "<text>"          Record a blocker
mnemo feat blocker resolve "<text>"  Resolve a blocker
mnemo feat note "<text>"             Add a note
mnemo feat status "<text>"           Update current status
mnemo feat link-file <path>          Link a file to the feature
mnemo feat unlink-file <path>        Unlink a file
mnemo feat done                      Mark feature as done
```

### Search

```
mnemo search "<query>"    Natural language search
  --limit <n>             Number of results (default: 10)
  --output json           JSON output
  --no-hybrid             Pure semantic ranking (no graph/feat boost)
```

### Graph

```
mnemo graph deps <file>       Files this file imports
mnemo graph refs <file>       Files that import this file
mnemo graph affected <file>   Transitive dependents (max depth 3)
mnemo graph symbols <file>    Top-level functions and classes
```

### Models

```
mnemo models list               Show installed embedding models
mnemo models download <name>    Explicitly download a model
mnemo models remove <name>      Remove a cached model
```

### Agent Integration

```
mnemo install claude     Write Claude Code skill + update CLAUDE.md
mnemo install codex      Create/update AGENTS.md
mnemo install copilot    Create/update .github/copilot-instructions.md
mnemo install cursor     Create/update .cursorrules
```

### MCP Server

```
mnemo mcp serve    Start Mnemo as an MCP server (stdio transport)
```

### Export

```
mnemo export obsidian [--output <dir>]    Export all feats as Obsidian vault
```

---

## Configuration

```bash
mnemo config list                  Show all settings
mnemo config get <key>             Get a setting
mnemo config set <key> <value>     Set a setting
```

| Key | Default | Options |
|---|---|---|
| `embedding.provider` | `onnx` | `onnx`, `ollama`, `openai` |
| `embedding.model` | `all-MiniLM-L6-v2` | any model name |
| `vector-store` | `sqlite` | `sqlite`, `lancedb` |
| `embedding.ollamaUrl` | `http://localhost:11434` | any URL |
| `embedding.openaiKey` | _(empty)_ | your OpenAI API key |
| `watch` | `false` | `true`, `false` |

### Using Ollama

```bash
mnemo config set embedding.provider ollama
mnemo config set embedding.model nomic-embed-text
mnemo update
```

### Using LanceDB

```bash
mnemo config set vector-store lancedb
mnemo update
```

---

## Agent Integration Details

### Claude Code

`mnemo install claude` adds a skill to `~/.claude/skills/mnemo.md` and appends instructions to `CLAUDE.md`. Available slash commands in Claude Code sessions:

- `/mnemo-context` — load current feature context
- `/mnemo-search <query>` — search codebase
- `/mnemo-decision <text>` — record a decision
- `/mnemo-blocker <text>` — record a blocker

### MCP Server

For agents that support the Model Context Protocol:

```bash
mnemo mcp serve
```

Exposes tools: `get_feat_context`, `record_decision`, `record_blocker`, `resolve_blocker`, `link_file`, `search_codebase`, `get_deps`, `get_refs`, `get_symbols`.

---

## FAQ

**Q: Does Mnemo send my code anywhere?**  
All indexes are stored locally in `~/.mnemo/`. The default embedding model runs entirely on-device via ONNX.

**Q: How much disk space does it use?**  
The ONNX model is ~88MB. The vector index for a 100k LOC project is typically 20–50MB. The graph index and feature cache are negligible.

**Q: Does it work on Windows?**  
Yes. Mnemo is tested on Windows, macOS, and Linux via GitHub Actions CI.

**Q: How do I reset the index?**  
Delete `~/.mnemo/projects/<id>/index.db` (or `lancedb/`) and run `mnemo update`.

**Q: Can I use it without git?**  
Yes, but the git hook (auto-reindex on commit) won't be installed. Run `mnemo update` manually after changes.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, architecture, and PR guidelines.

## License

MIT
