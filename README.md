<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="website/assets/xctx-lockup-v-dark.svg" />
    <source media="(prefers-color-scheme: light)" srcset="website/assets/xctx-lockup-v.svg" />
    <img src="website/assets/xctx-lockup-v.svg" alt="Cross Context" height="200" />
  </picture>
  <br /><br />
  <strong>Your codebase, remembered — across every session, across every agent.</strong>
  <br />
  Persistent context for AI coding agents.
  <br /><br />

[![CI](https://github.com/arturdonda/cross-context/actions/workflows/ci.yml/badge.svg)](https://github.com/arturdonda/cross-context/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/cross-context?color=d97706)](https://www.npmjs.com/package/cross-context)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

```bash
npm install -g cross-context
```

---

## The problem

You spend an hour with your AI agent. You explain the architecture, scope the relevant files, decide to use Stripe Checkout over Payment Intents, and hit a blocker with webhook validation.

Next session — blank slate. The agent re-reads your directory tree, re-traces your imports, asks what framework you're using. You explain everything again.

Hit your token limit mid-feature and need to switch from Claude to Copilot? Same thing — you start from zero and re-explain everything.

**This isn't a token budget problem. It's a memory problem.**

---

## What Cross Context does

`xctx` keeps persistent memory of your codebase — updated automatically on every git commit. Any agent reads it at session start and already knows where you left off.

Switch agents mid-feature, hit a context limit, or start a new session the next day — the memory follows you.

### `xctx feat context` — the differentiator

Per-feature decisions, linked files, blockers, and status — persisted across sessions and agents:

```
$ xctx feat context

# FEAT: payment-integration

Branch:       feature/payment-integration
Status:       in-progress
Last updated: 2026-05-02

## Relevant Files
· src/routes/payments.ts   # main route handler
· src/services/stripe.ts
· src/models/order.ts

## Decisions
· 2026-04-30  Stripe Checkout, not Payment Intents — simpler for MVP
· 2026-05-01  Orders stay PENDING until webhook confirms payment

## Current Status
Webhook handler implemented, writing tests.
```

### `xctx search` — semantic search

Natural-language queries over your codebase. Fully local, no API keys.

```
$ xctx search "JWT authentication middleware"

src/middleware/auth.ts    lines 12–45   score 0.94
src/services/token.ts     lines 1–28    score 0.87
src/routes/protected.ts   lines 3–8     score 0.71
```

### `xctx graph` — structural graph

File-level dependency graph via Tree-sitter. Know what breaks before you touch it.

```
$ xctx graph deps src/services/stripe.ts

src/models/order.ts
src/config/env.ts
src/utils/logger.ts
```

---

## Quick start

```bash
# 1. Install
npm install -g cross-context

# 2. Initialize in your project
xctx init

# 3. Index the codebase (downloads ONNX model on first run, ~88MB)
xctx update

# 4. Start tracking a feature
xctx feat start payment-flow

# 5. Wire up your AI agent
xctx install claude     # Claude Code
xctx install codex      # OpenAI Codex / ChatGPT
xctx install copilot    # GitHub Copilot
xctx install cursor     # Cursor
xctx install windsurf   # Windsurf
```

Your agent now reads `xctx feat context` at the start of every session and records decisions as you work.

---

## Recording context

```bash
# Record an architectural decision
xctx feat decision "Using Stripe Checkout — simpler than Payment Intents for MVP"

# Link files to the current feature
xctx feat link-file src/routes/payments.ts --reason "main route handler"

# Track and resolve blockers
xctx feat blocker "Webhook signature validation failing in test env"
xctx feat blocker resolve "Webhook signature validation failing in test env"

# Update status at end of session
xctx feat status "Webhook handler done, writing tests"
```

---

## Agent support

| Agent          | Command                    | What gets installed                                                                                       |
| -------------- | -------------------------- | --------------------------------------------------------------------------------------------------------- |
| Claude Code    | `xctx install claude`      | `CLAUDE.md` + `.claude/skills/xctx.md` + MCP server in `~/.claude/settings.json`                        |
| GitHub Copilot | `xctx install copilot`     | `.github/copilot-instructions.md` + `.github/skills/xctx/SKILL.md` + MCP server in `.vscode/mcp.json`   |
| OpenAI Codex   | `xctx install codex`       | `AGENTS.md` + `.agents/skills/xctx/SKILL.md` + MCP server in `~/.codex/config.toml`                     |
| Cursor         | `xctx install cursor`      | `.cursor/rules/xctx.mdc` + `.cursor/skills/xctx/SKILL.md` + MCP server in `.cursor/mcp.json`             |
| Windsurf       | `xctx install windsurf`    | `.windsurfrules` + `.windsurf/skills/xctx/SKILL.md` + MCP server in `~/.codeium/windsurf/mcp_config.json` |

All agents receive instructions to load feature context at session start, use MCP tools before CLI, and record decisions automatically.

**All agents get MCP integration automatically.** Each `xctx install <agent>` command registers the MCP server in the agent's native config file. Agents can then call `get_feat_context`, `search_codebase`, `record_decision`, and other tools natively — no shell permissions needed. Restart your agent once after install.

**MCP server** (any MCP-compatible client):

```bash
xctx mcp serve
```

Exposes: `get_feat_context`, `search_codebase`, `record_decision`, `record_blocker`, `resolve_blocker`, `link_file`, `get_deps`, `get_refs`, `get_symbols`.

---

## Privacy

All indexes are stored locally in `~/.xctx/`. The default embedding model (`all-MiniLM-L6-v2`) runs entirely on-device via ONNX Runtime. **No code is ever sent to any server.**

Want better embedding quality? Swap providers:

```bash
xctx config set embedding.provider ollama
xctx config set embedding.model nomic-embed-text
```

---

## Full command reference

<details>
<summary>Show all commands</summary>

### Project

```
xctx init                          Initialize Cross Context for this project
xctx update [--since <commit>]     Incrementally index the codebase (skips unchanged files)
xctx doctor                        Diagnose setup issues with fix instructions
xctx status                        Show index stats (files, chunks, last indexed)
```

### Feature context

```
xctx feat start <name>              Start a new feature context
xctx feat list                      List all features
xctx feat switch <name>             Switch active feature
xctx feat context [name]            Print current feature context (markdown)
xctx feat context [name] --no-suggest  Suppress file suggestions (for pipes)
xctx feat suggest-files             Suggest files to link based on current context
xctx feat decision "<text>"         Record an architectural decision
xctx feat blocker "<text>"          Record a blocker
xctx feat blocker resolve "<text>"  Resolve a blocker
xctx feat note "<text>"             Add a note
xctx feat status "<text>"           Update current status
xctx feat link-file <path>          Link a file to the feature
xctx feat unlink-file <path>        Unlink a file
xctx feat done                      Mark feature as done
```

### Search & graph

```
xctx search "<query>" [--limit n] [--output json] [--no-hybrid] [--include-tests]
xctx graph deps <file>
xctx graph refs <file>
xctx graph affected <file>
xctx graph symbols <file>
```

### Configuration

```
xctx config list
xctx config get <key>
xctx config set <key> <value>
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
xctx export obsidian [--output <dir>]    Export all feats as Obsidian vault
```

</details>

---

## FAQ

**Does Cross Context send my code anywhere?**
No. All indexes are stored in `~/.xctx/`. The default embedding model runs entirely on-device via ONNX Runtime.

**How much disk space does it use?**
The ONNX model is ~88MB. The vector index for a 100k LOC project is typically 20–50MB. The graph index and feature cache are negligible.

**Does it work on Windows?**
Yes. Tested on Windows, macOS, and Linux via GitHub Actions CI.

**How do I reset the index?**
Delete `~/.xctx/projects/<id>/index.db` and run `xctx update`. Or run `xctx doctor` for guided diagnostics.

**Can I use it without git?**
Yes, but the post-commit hook won't be installed. Run `xctx update` manually after changes.

**What happens when I switch agents?**
The memory lives in `~/.xctx/`, not inside any agent. Any agent you wire up with `xctx install` reads the same context — decisions, files, status — regardless of which agent wrote it.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
