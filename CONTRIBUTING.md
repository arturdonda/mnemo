# Contributing to Cross Context

Thank you for your interest in contributing. This document covers setup, architecture, conventions, and the PR process.

---

## Code of Conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/) (v2.1). By participating, you agree to uphold it. Report violations to the maintainers via GitHub.

---

## Good First Issues

Issues labeled [`good first issue`](https://github.com/arturdonda/cross-context/labels/good%20first%20issue) are explicitly scoped and well-defined — a good entry point if you are new to the codebase.

Issues labeled [`help wanted`](https://github.com/arturdonda/cross-context/labels/help%20wanted) are higher-effort but welcome external contributions.

If you want to work on something, leave a comment on the issue first so we can coordinate.

---

## Architecture Overview

Cross Context has three indexing layers:

| Layer            | Module            | Storage                           |
| ---------------- | ----------------- | --------------------------------- |
| FEAT Cache       | `src/core/feat/`  | `~/.xctx/projects/{id}/feats/`   |
| Semantic Index   | `src/core/index/` | `~/.xctx/projects/{id}/index.db` |
| Structural Graph | `src/core/graph/` | `~/.xctx/projects/{id}/graph.db` |

See `docs/ARCHITECTURE.md` for full design documentation and `docs/DECISIONS.md` for architectural decision records (ADRs).

---

## Setup

```bash
git clone https://github.com/arturdonda/cross-context
cd xctx
npm install
```

---

## Development

```bash
npm run dev -- feat start my-feature   # run without building
npm run build                          # compile to dist/
npm run typecheck                      # tsc --noEmit (strict mode)
npm run lint                           # biome check
npm run lint:fix                       # biome check --write
npm run test                           # vitest run (all tests)
npm run bench                          # run performance benchmarks
```

---

## Project Structure

```
src/
  cli.ts                  # entry point — registers all commands
  commands/               # CLI command handlers (one file per group)
  core/
    feat/                 # FEAT cache: store, renderer, active
    graph/                # structural graph: parser, store, pipeline
    index/                # semantic index: embedder, chunker, backends
    models/               # model download and manifest
    config.ts             # ~/.xctx/config.json
    paths.ts              # ~/.xctx/ directory structure
    project.ts            # project identity (XXH3 hash of git remote)
    error.ts              # XctxError + handleError
  integrations/
    agents/               # Claude, Codex, Copilot, Cursor content
    mcp/                  # MCP server and tools
  types.ts                # re-exports of shared types
tests/
  core/                   # unit tests (one file per module)
  commands/               # command tests
  e2e/                    # end-to-end tests
  benchmarks/             # performance benchmarks
docs/
  PRD.md                  # product requirements
  ARCHITECTURE.md         # 3-layer design and ADRs
  DECISIONS.md            # architectural decision records
  STACK.md                # dependencies and versions
  TASKS.md                # implementation task list
```

---

## Conventions

- **en-US only** — all code, comments, docs, commit messages, and error messages
- **ESM only** — `import`/`export`, never `require()`
- **TypeScript strict** — no implicit `any`, no unnecessary `!`
- **Biome** for lint and format — run before committing
- **Errors** — never `process.exit()` directly; use `XctxError` from `src/core/error.ts`
- **Tests** — one test file per module; co-located as `*.test.ts`
- **No obvious comments** — comment only non-evident logic

---

## Commit Message Convention

```
feat(T###): short description
fix(T###): short description
chore: short description
docs: short description
```

The `T###` reference is optional for external contributors — use it if your change relates to a task in `docs/TASKS.md`.

---

## PR Process

1. Fork the repo and create a feature branch
2. Implement with tests (`npm run test` must pass)
3. Run `npm run typecheck` and `npm run lint`
4. Open a PR against `main` — CI runs automatically on Windows, macOS, and Linux

Keep PRs focused: one thing per PR. If you want to refactor something unrelated to your fix, open a separate PR.

---

## ADR Process

Architectural decisions are recorded in `docs/DECISIONS.md` as ADRs (D001–D0xx). Do not reopen a closed ADR without explicit reason. For new decisions, append a new entry with the current date.

---

## Proposing Features

Open a [GitHub Discussion](https://github.com/arturdonda/cross-context/discussions) before opening an issue for large features. This keeps the issue tracker focused on actionable work.
