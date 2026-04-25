# Mnemo

> Your codebase, remembered — across every AI session.

**Mnemo** is a CLI tool that gives AI coding agents (Claude Code, GitHub Copilot, Codex, Cursor, and others) persistent memory of your codebase. Agents stop re-discovering your project from scratch on every session and start where they left off.

---

## The Problem

Every time you start a new AI coding session, the agent starts blind. It spends the first exchanges mapping your project — reading directory trees, tracing imports, re-reading files it already read yesterday. On a medium-sized codebase, this costs 2,000–8,000 tokens before any real work begins.

Worse: every feature conversation resets. Decisions made last session ("we chose Stripe Checkout because..."), files scoped in, blockers noted — all gone.

Existing tools cover parts of this problem: structural graph tools (like codebase-memory-mcp) reduce navigation tokens but leave a documented 9% quality gap on semantic queries, and none persist per-feature context across sessions.

## The Solution

Mnemo maintains three complementary indexes, updated automatically via git hooks:

1. **Semantic Index** — embeddings (local, no API cost) for natural language queries: _"where is JWT auth handled?"_ — fills the gap that pure structural tools miss
2. **Structural Graph** — import/export dependency graph via Tree-sitter: _"what depends on UserService?"_
3. **FEAT Context Cache** — per-feature memory: relevant files, typed decisions, blockers, and status — persisted across sessions

The key insight: most tools solve _"how does the agent find code?"_ Mnemo solves _"how does the agent not need to search again?"_

---

## Quick Start

```bash
# Install globally
npm install -g mnemo-cli

# Initialize in a project (installs git hooks, creates index)
cd my-project
mnemo init

# Wire up your AI agent
mnemo install claude    # adds context to CLAUDE.md + installs Skill
mnemo install codex     # generates AGENTS.md
mnemo install copilot   # generates .github/copilot-instructions.md
mnemo install cursor    # generates .cursorrules

# Search semantically
mnemo search "how is authentication handled"

# Start a feature context
mnemo feat start payment-integration
mnemo feat decision "Using Stripe Checkout, not Payment Intents — simpler for MVP"
mnemo feat blocker "Stripe webhook signature validation failing in test env"
mnemo feat link-file src/routes/payments.ts
mnemo feat link-file src/services/stripe.ts

# Dump context for the current session (agents call this automatically after install)
mnemo feat context
```

---

## Key Features

- **Zero infrastructure** — SQLite only, no servers, works offline
- **Cross-agent** — Claude Code, Copilot, Codex, Cursor, any agent via CLI or MCP
- **Cross-OS** — Windows, macOS, Linux
- **Auto-updating** — git hooks + XXH3 hash-based freshness validation on every query
- **Typed FEAT cache** — structured decisions, blockers, and file links (not just free-form notes)
- **Agent installer** — `mnemo install <agent>` wires up any agent in one command
- **Human-readable** — all context is plain markdown, optionally browsable via Obsidian

---

## Agent Integration

After `mnemo init`, wire up your agents once:

```bash
mnemo install claude    # Claude Code: updates CLAUDE.md, installs /mnemo-context Skill
mnemo install codex     # Codex CLI: generates AGENTS.md with mnemo instructions
mnemo install copilot   # GitHub Copilot: generates .github/copilot-instructions.md
mnemo install cursor    # Cursor: generates .cursorrules
```

From that point, each agent session automatically receives:

- Current FEAT context (relevant files, decisions, blockers, status)
- Instructions to use `mnemo search` before exploring the codebase
- Instructions to record decisions via `mnemo feat decision`

---

## Configuration

```bash
mnemo config set embedding.provider onnx        # default: bundled local model
mnemo config set embedding.provider ollama      # use Ollama if installed
mnemo config set embedding.model nomic-embed-text
mnemo config set vector-store sqlite            # default
mnemo config set vector-store lancedb           # alternative backend
mnemo config set watch true                     # enable file watcher (opt-in)
```

---

## Project Status

- [x] Documentation & PRD
- [ ] Phase 1: FEAT context cache (CLI + Claude Code Skill)
- [ ] Phase 2: Semantic index (sqlite-vec + ONNX embeddings)
- [ ] Phase 3: Structural graph (Tree-sitter, imports/exports)
- [ ] Phase 3: MCP server
- [ ] Phase 4: Agent installers (claude, codex, copilot, cursor)
- [ ] Phase 4: Obsidian export
