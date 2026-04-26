# Contributing to Mnemo

## Architecture Overview

Mnemo has three indexing layers:

| Layer | Module | Storage |
|---|---|---|
| FEAT Cache | `src/core/feat/` | `~/.mnemo/projects/{id}/feats/` |
| Semantic Index | `src/core/index/` | `~/.mnemo/projects/{id}/index.db` |
| Structural Graph | `src/core/graph/` | `~/.mnemo/projects/{id}/graph.db` |

See `docs/ARCHITECTURE.md` for full design documentation and ADRs.

## Setup

```bash
git clone https://github.com/arturdonda/mnemo
cd mnemo
npm install
```

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
    config.ts             # ~/.mnemo/config.json
    paths.ts              # ~/.mnemo/ directory structure
    project.ts            # project identity (XXH3 hash of git remote)
    error.ts              # MnemoError + handleError
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

## Conventions

- **en-US only** — all code, comments, docs, commit messages
- **ESM only** — `import`/`export`, never `require()`
- **TypeScript strict** — no implicit `any`, no unnecessary `!`
- **Biome** for lint and format
- **Errors** — never `process.exit()` directly; use `MnemoError`
- **Tests** — one test file per module; co-located as `*.test.ts`
- **No obvious comments** — only non-evident logic

## Commit Message Convention

```
feat(T###): short description
fix(T###): short description
chore: short description
docs: short description
```

## PR Process

1. Fork the repo and create a feature branch
2. Implement with tests (`npm run test` must pass)
3. Run `npm run typecheck` and `npm run lint`
4. Open a PR — CI runs on all three OSes automatically

## ADR Process

Architectural decisions are recorded in `docs/DECISIONS.md` as ADRs (D001–D0xx). Do not reopen a closed ADR without explicit reason. For new decisions, append a new entry.
