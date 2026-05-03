<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="website/assets/xctx-lockup-v-dark.svg" />
    <source media="(prefers-color-scheme: light)" srcset="website/assets/xctx-lockup-v.svg" />
    <img src="website/assets/xctx-lockup-v.svg" alt="Cross Context" height="200" />
  </picture>
  <br /><br />
  <strong>Your codebase, remembered — across every session, across every agent.</strong>
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

You're three hours into a feature with Claude Code. You've scoped the right files, made a key call about Stripe Checkout vs. Payment Intents, and just unblocked a webhook issue.

Then the tokens run out.

You open ChatGPT. Blank slate. You spend the next 15 minutes re-explaining the architecture, which files matter, the decision you made an hour ago, where you left off. Every agent switch. Every new session. Every time.

**The context you built up doesn't go anywhere — because it was never written down.**

---

## What Cross Context does

`xctx` maintains five layers of persistent memory about your codebase and your work. Any agent you wire up reads them at session start and picks up exactly where you left off — even if it's a different agent than the one that wrote the context.

```bash
# You left off here with Claude
$ xctx feat context

# FEAT: payment-integration
# Status: in-progress — webhook handler done, writing tests
# Decision: Stripe Checkout, not Payment Intents — simpler for MVP
# Files: src/routes/payments.ts · src/services/stripe.ts · src/models/order.ts

# Now ChatGPT reads the same thing and continues from here
```

No re-explaining. No cold starts. Just continuity.

---

## Five layers of memory

### 1. Feature Context
What you're building right now — linked files, decisions, blockers, and current status. Updated as you work. Read by any agent at session start.

```bash
xctx feat start payment-flow
xctx feat decision "Stripe Checkout — simpler for MVP"
xctx feat link-file src/routes/payments.ts
xctx feat blocker "Webhook signature failing in test env"
xctx feat context   # what any agent reads
```

### 2. Project Memory
Architectural patterns and constraints that apply across your entire codebase — not just the current feature. Written once, relevant forever.

```bash
xctx memory add --project "Auth uses JWT with 15min expiry, refresh token in httpOnly cookie"
xctx memory add --project "All DB queries go through src/db/query.ts — never raw SQL"
```

### 3. Developer Memory
Your personal patterns, preferences, and expertise — follows you across every project and every agent.

```bash
xctx memory add --user "I prefer explicit error types over generic Error throws"
xctx memory add --user "Always write the test before the implementation"
```

### 4. Codebase Index
Natural-language search over your entire codebase. Fully local — no API keys, no code sent anywhere.

```bash
xctx search "JWT authentication middleware"
# src/middleware/auth.ts    lines 12–45   score 0.94
# src/services/token.ts     lines 1–28    score 0.87
```

### 5. Dependency Graph
File-level dependency map via Tree-sitter. Know what breaks before you touch anything.

```bash
xctx graph deps src/services/stripe.ts
# src/models/order.ts
# src/config/env.ts
```

---

## Quick start

```bash
# 1. Install
npm install -g cross-context

# 2. Initialize in your project
xctx init

# 3. Index the codebase
xctx update

# 4. Wire up your agent
xctx install claude     # Claude Code
xctx install codex      # OpenAI Codex / ChatGPT
xctx install copilot    # GitHub Copilot
xctx install cursor     # Cursor
xctx install windsurf   # Windsurf
```

From here, every agent you wire up reads the full memory at session start. Switch agents anytime — the context comes with you.

---

## Agent support

| Agent          | Command                 | What gets installed                                                                                        |
| -------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| Claude Code    | `xctx install claude`   | `CLAUDE.md` + `.claude/skills/xctx.md` + MCP server in `~/.claude/settings.json`                         |
| GitHub Copilot | `xctx install copilot`  | `.github/copilot-instructions.md` + `.github/skills/xctx/SKILL.md` + MCP in `.vscode/mcp.json`            |
| OpenAI Codex   | `xctx install codex`    | `AGENTS.md` + `.agents/skills/xctx/SKILL.md` + MCP in `~/.codex/config.toml`                             |
| Cursor         | `xctx install cursor`   | `.cursor/rules/xctx.mdc` + `.cursor/skills/xctx/SKILL.md` + MCP in `.cursor/mcp.json`                    |
| Windsurf       | `xctx install windsurf` | `.windsurfrules` + `.windsurf/skills/xctx/SKILL.md` + MCP in `~/.codeium/windsurf/mcp_config.json`        |

All agents also get MCP integration — they call `get_feat_context`, `search_codebase`, `record_decision`, and other tools natively without shell permissions. Restart your agent once after install.

**MCP server** for any MCP-compatible client:

```bash
xctx mcp serve
```

---

## Privacy

Everything lives in `~/.xctx/` on your machine. The default embedding model (`all-MiniLM-L6-v2`) runs entirely on-device via ONNX Runtime. No code, decisions, or context is ever sent to any server.

Optional cloud embedding for better quality:

```bash
xctx config set embedding.provider ollama   # local via Ollama
xctx config set embedding.provider openai   # OpenAI embeddings API
```

When using OpenAI, only code chunks reach the embedding API — never your decisions, blockers, or memory entries.

---

## Full command reference

<details>
<summary>Show all commands</summary>

### Project

```
xctx init                          Initialize Cross Context for this project
xctx update [--since <commit>]     Incrementally index the codebase
xctx doctor                        Diagnose setup issues with fix instructions
xctx status                        Show index stats
```

### Feature context

```
xctx feat start <name>
xctx feat list
xctx feat switch <name>
xctx feat context [name] [--no-suggest]
xctx feat suggest-files
xctx feat decision "<text>"
xctx feat blocker "<text>"
xctx feat blocker resolve "<text>"
xctx feat note "<text>"
xctx feat status "<text>"
xctx feat link-file <path>
xctx feat unlink-file <path>
xctx feat done
```

### Memory

```
xctx memory add --project "<insight>"
xctx memory add --user "<insight>"
xctx memory list [--project] [--user]
xctx memory search "<query>" [--project] [--user]
xctx memory remove <id> [--project|--user]
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

### Export

```
xctx export obsidian [--output <dir>]
```

</details>

---

## FAQ

**What happens when I switch agents mid-feature?**
The memory lives in `~/.xctx/`, not inside any agent. Wire up the new agent with `xctx install <agent>` and it reads the same feature context, project memory, and decisions — regardless of which agent wrote them.

**Does it send my code anywhere?**
No. Everything is local. The default embedding model runs on-device via ONNX Runtime.

**Does it work on Windows?**
Yes. Tested on Windows, macOS, and Linux.

**How do I reset the index?**
Delete `~/.xctx/projects/<id>/index.db` and run `xctx update`. Or run `xctx doctor` for guided diagnostics.

**Can I use it without git?**
Yes, but the post-commit hook won't be installed. Run `xctx update` manually after changes.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
