# Cross Context — Agent Context

## What is this

Cross Context is a CLI tool (`xctx`) that gives AI coding agents persistent memory of a codebase. It solves the cold-start problem: agents stop rediscovering the project from scratch each session.

Three layers:

1. **Semantic Index** — local embeddings for natural language queries
2. **Structural Graph** — dependency graph via Tree-sitter
3. **FEAT Context Cache** — per-feature context: files, decisions, blockers, status (the differentiator)

## Current phase

**Phase 1 in progress: FEAT Context Cache**

Exclusive focus on Layer 3. Layers 1 and 2 are Phase 2 and 3. Do not implement anything outside Phase 1 scope without explicit approval.

See tasks: `docs/TASKS.md`

## Project structure

```
cross-context/
  src/
    cli.ts                  # entry point — registers all commands
    commands/               # CLI command handlers (one file per group)
      feat.ts
      install.ts
      init.ts
      config.ts
    core/
      feat/
        store.ts            # events.jsonl read/write
        renderer.ts         # generates context.md from events
        active.ts           # tracks active feat
      project.ts            # project identity (XXH3 hash of git remote)
      paths.ts              # ~/.xctx/ directory structure
    types.ts                # shared types (FeatureEvent, etc.)
  tests/
  dist/
  docs/
    PRD.md
    ARCHITECTURE.md
    DECISIONS.md
    STACK.md
    TASKS.md
```

## How to run

```bash
npm install
npm run dev -- feat start my-feature   # run without building
npm run build                          # compile to dist/
npm run test                           # vitest
npm run lint                           # biome check
npm run typecheck                      # tsc --noEmit
```

Install globally: `npm install -g cross-context`

## Conventions

- **en-US only** — all code, comments, docs, commit messages, and error messages in English
- **ESM only** — `import`/`export`, never `require()`
- **TypeScript strict** — no implicit `any`, no unnecessary `!`
- **Biome** for lint and format — run before committing
- **Errors** — never call `process.exit()` directly; use `XctxError` from `src/core/error.ts`
- **Tests** — one test file per module (`*.test.ts` next to the source file)
- **No obvious comments** — comment only non-evident logic

## Runtime data

```
~/.xctx/
  config.json
  projects/
    {project-id}/           # xxh3(git remote)[0:16]
      meta.json
      feats/
        {feat-name}/
          events.jsonl      # source of truth (append-only)
          context.md        # derived from events.jsonl
          meta.json
      active_feat           # name of the active feat (plain text)
```

## Reference docs

| Doc                    | When to read                                                |
| ---------------------- | ----------------------------------------------------------- |
| `docs/PRD.md`          | To understand the problem and target users                  |
| `docs/ARCHITECTURE.md` | To understand the 3 layers and technical design             |
| `docs/DECISIONS.md`    | To understand the _why_ behind each choice (ADRs D001–D017) |
| `docs/STACK.md`        | For dependencies, versions, and project configuration       |
| `docs/TASKS.md`        | To find what to implement now (Phase 1)                     |

## Rules for agents

1. **Read `docs/TASKS.md` before writing any code** — to know what is pending and what is done
2. **Phase 1 = FEAT cache only** — do not start embedding or graph layers
3. **Before creating a new file**, check if something similar already exists in the structure above
4. **When completing a task**, mark it as done in `docs/TASKS.md`
5. **Architectural decisions** are recorded in `docs/DECISIONS.md` — do not reopen without explicit reason
