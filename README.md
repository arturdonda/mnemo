# Mnemo

> Your codebase, remembered — across every AI session.

[![CI](https://github.com/arturdonda/mnemo/actions/workflows/ci.yml/badge.svg)](https://github.com/arturdonda/mnemo/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/mnemo-cli)](https://www.npmjs.com/package/mnemo-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Mnemo** gives AI coding agents persistent memory of your codebase. Start every session exactly where you left off — decisions, context, and all.

```bash
npm install -g mnemo-cli
```

---

## The Problem

You spent an hour with your AI agent yesterday. You explained the architecture, scoped the files, decided to use Stripe Checkout over Payment Intents, and hit a blocker with webhook validation.

Today you open a new session. The agent has no idea any of that happened.

It re-reads your directory tree. Re-traces your imports. Asks what framework you're using. You explain everything again.

This is not a token budget problem. It is a memory problem.

---

## What Mnemo Does

Mnemo keeps three indexes, updated automatically on every git commit.

### FEAT Cache — the differentiator

Per-feature context that persists across sessions. At the start of every session, your agent reads:

```
$ mnemo feat context

# FEAT: payment-integration

**Branch:** feature/payment-integration
**Status:** in-progress
**Last updated:** 2026-04-25

## Relevant Files
- `src/routes/payments.ts` — main route handler
- `src/services/stripe.ts`
- `src/models/order.ts`

## Decisions
- 2026-04-20: Using Stripe Checkout, not Payment Intents — simpler for MVP scope
- 2026-04-22: Orders stay in PENDING until webhook confirms payment

## Current Status
Webhook handler implemented, writing tests.

## Blockers
None active.
```

Your agent already knows what was decided, which files matter, and where you stopped.

### Semantic Search

```
$ mnemo search "JWT authentication middleware"

src/middleware/auth.ts   (lines 12–45)  score 0.94
src/services/token.ts    (lines 1–28)   score 0.87
src/routes/protected.ts  (lines 3–8)    score 0.71
```

Natural-language queries over your codebase, fully local. No API calls. No code leaves your machine.

### Structural Graph

```
$ mnemo graph deps src/services/stripe.ts

src/models/order.ts
src/config/env.ts
src/utils/logger.ts
```

File-level dependency graph via Tree-sitter. Know what breaks before you touch it.

---

## Quick Start

```bash
# 1. Install
npm install -g mnemo-cli

# 2. Initialize in your project
mnemo init

# 3. Index the codebase (downloads ONNX model on first run, ~88MB)
mnemo update

# 4. Start tracking a feature
mnemo feat start payment-flow

# 5. Wire up your AI agent
mnemo install claude     # Claude Code
mnemo install codex      # OpenAI Codex / ChatGPT
mnemo install copilot    # GitHub Copilot
mnemo install cursor     # Cursor
```

From this point, your agent automatically reads `mnemo feat context` at session start and records decisions as you work.

---

## Recording Context

```bash
# Decisions are the most important thing to record
mnemo feat decision "Using Stripe Checkout — simpler than Payment Intents for MVP"

# Link files to the current feature
mnemo feat link-file src/routes/payments.ts --reason "main route handler"

# Track and resolve blockers
mnemo feat blocker "Webhook signature validation failing in test env"
mnemo feat blocker resolve "Webhook signature validation failing in test env"

# Update status at the end of a session
mnemo feat status "Webhook handler done, writing tests"
```

---

## Agent Support

| Agent          | Command                 | What gets installed               |
| -------------- | ----------------------- | --------------------------------- |
| Claude Code    | `mnemo install claude`  | Skill + CLAUDE.md instructions    |
| OpenAI Codex   | `mnemo install codex`   | AGENTS.md                         |
| GitHub Copilot | `mnemo install copilot` | `.github/copilot-instructions.md` |
| Cursor         | `mnemo install cursor`  | `.cursorrules`                    |

All agents receive instructions to load feature context at session start, use `mnemo search` before exploring unfamiliar code, and record decisions automatically.

**MCP server** (for any MCP-compatible client):

```bash
mnemo mcp serve
```

Exposes: `get_feat_context`, `search_codebase`, `record_decision`, `record_blocker`, `resolve_blocker`, `link_file`, `get_deps`, `get_refs`.

---

## Privacy

All indexes are stored locally in `~/.mnemo/`. The default embedding model (`all-MiniLM-L6-v2`) runs entirely on-device via ONNX Runtime. No code is ever sent to any server.

To improve embedding quality, swap to Ollama or OpenAI:

```bash
mnemo config set embedding.provider ollama
mnemo config set embedding.model nomic-embed-text
```

---

## Full Command Reference

<details>
<summary>Show all commands</summary>

### Project

```
mnemo init                          Initialize Mnemo for this project
mnemo update [--since <commit>]     Index or re-index the codebase
mnemo doctor                        Diagnose setup issues with fix instructions
mnemo status                        Show index stats (files, chunks, last indexed)
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

### Search & Graph

```
mnemo search "<query>" [--limit n] [--output json] [--no-hybrid]
mnemo graph deps <file>
mnemo graph refs <file>
mnemo graph affected <file>
mnemo graph symbols <file>
```

### Configuration

```
mnemo config list
mnemo config get <key>
mnemo config set <key> <value>
```

| Key                   | Default                  | Options                    |
| --------------------- | ------------------------ | -------------------------- |
| `embedding.provider`  | `onnx`                   | `onnx`, `ollama`, `openai` |
| `embedding.model`     | `all-MiniLM-L6-v2`       | any model name             |
| `vector-store`        | `sqlite`                 | `sqlite`, `lancedb`        |
| `embedding.ollamaUrl` | `http://localhost:11434` | any URL                    |
| `embedding.openaiKey` | _(empty)_                | your OpenAI API key        |
| `watch`               | `false`                  | `true`, `false`            |

### Export

```
mnemo export obsidian [--output <dir>]    Export all feats as Obsidian vault
```

</details>

---

## FAQ

**Q: Does Mnemo send my code anywhere?**
No. All indexes are stored locally in `~/.mnemo/`. The default embedding model runs entirely on-device via ONNX Runtime.

**Q: How much disk space does it use?**
The ONNX model is ~88MB. The vector index for a 100k LOC project is typically 20–50MB. The graph index and feature cache are negligible.

**Q: Does it work on Windows?**
Yes. Mnemo is tested on Windows, macOS, and Linux via GitHub Actions CI.

**Q: How do I reset the index?**
Delete `~/.mnemo/projects/<id>/index.db` and run `mnemo update`. Or run `mnemo doctor` for guided diagnostics.

**Q: Can I use it without git?**
Yes, but the post-commit hook won't be installed. Run `mnemo update` manually after changes.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
