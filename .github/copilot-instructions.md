# Mnemo — Copilot Instructions

## Project

Mnemo (`mnemo`) is a CLI tool that gives AI coding agents persistent memory of a codebase. It solves the cold-start problem: agents stop rediscovering the project from scratch each session.

Three layers (only Layer 3 is in scope now):

- **Layer 1** — Semantic index (embeddings, Phase 2)
- **Layer 2** — Structural graph via Tree-sitter (Phase 3)
- **Layer 3** — FEAT Context Cache: per-feature files, decisions, blockers, status (Phase 1 — current)

## Current phase

**Phase 1: FEAT Context Cache only.**

Do not implement anything related to embeddings, vector stores, or Tree-sitter parsing. That is Phase 2 and 3.

Read `docs/TASKS.md` to find what to work on. Mark tasks `[x]` when done.

## Stack

- **Runtime**: Node.js 20+, TypeScript 5, ESM (`"type": "module"`)
- **CLI**: Commander.js
- **Database**: better-sqlite3 (synchronous)
- **Hashing**: @node-rs/xxhash (XXH3, not SHA256)
- **Tests**: Vitest
- **Lint/Format**: Biome

Full spec: `docs/STACK.md`

## Project structure

```
src/
  cli.ts                  # entry point
  commands/               # CLI command handlers
    feat.ts, init.ts, install.ts, config.ts
  core/
    feat/
      store.ts            # events.jsonl read/write
      renderer.ts         # context.md generator
      active.ts           # active feat tracking
      types.ts            # FeatureEvent, FeatureContext, etc.
    project.ts            # project identity (XXH3 of git remote)
    paths.ts              # ~/.mnemo/ directory structure
    error.ts              # MnemoError, handleError()
  integrations/agents/    # mnemo install <agent> generators
```

Data lives in `~/.mnemo/projects/{id}/feats/{name}/`:

- `events.jsonl` — append-only source of truth
- `context.md` — derived from events, regenerated on every write
- `meta.json` — feat metadata

## Conventions

- Imports always use `.js` extension (NodeNext module resolution)
- Never use `process.exit()` directly — throw `MnemoError` from `src/core/error.ts`
- No `any` types without explicit justification
- Tests go next to the file they test (`store.test.ts` alongside `store.ts`)
- `events.jsonl` is append-only — never mutate existing lines, only append

## Key architectural decisions

- **XXH3** for file hashing (not SHA256) — non-cryptographic, ~10x faster
- **In-memory accumulation + single SQLite flush** for indexing batches
- **events.jsonl** is source of truth; `context.md` is always derived, never edited directly
- **FEAT commands are typed** (`decision`, `blocker`, `link-file`) — not free-form notes
- All data is local, no servers, no internet required

Full decision log: `docs/DECISIONS.md` (D001–D016)

## Before writing code

1. Read `docs/TASKS.md` — find the next unchecked task
2. Read `docs/ARCHITECTURE.md` section for Layer 3 (FEAT Context Cache)
3. Read `docs/STACK.md` for exact package names and config
