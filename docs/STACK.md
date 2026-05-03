# Stack & Technical Setup

## Runtime

| Item          | Version   | Notes                                            |
| ------------- | --------- | ------------------------------------------------ |
| Node.js       | 20+ (LTS) | Minimum for stable native ESM and worker_threads |
| TypeScript    | 5.x       | strict mode enabled                              |
| Module system | ESM       | `"type": "module"` in package.json; no CommonJS  |

---

## CLI Framework

**Commander.js** (`commander`)

Chosen for: simple API, native TypeScript support, minimal boilerplate, unopinionated about project structure.

```typescript
import { Command } from 'commander'
const program = new Command()
program
  .command('feat')
  .command('start <name>')
  .action(async (name) => { ... })
```

Discarded alternatives: Yargs (more verbose API), Oclif (too opinionated for MVP).

---

## Test Framework

**Vitest**

Chosen for: native ESM, TypeScript-first with no extra config, Jest-compatible API, fast watch mode.

```bash
npm run test          # run all
npm run test:watch    # watch mode
npm run test:coverage # coverage report
```

Convention: test files live next to the module they test (`store.test.ts` next to `store.ts`).

---

## Linting & Formatting

**Biome** (`@biomejs/biome`)

Single tool for lint + format. Replaces ESLint + Prettier with minimal configuration.

```bash
npm run lint           # check
npm run lint:fix       # auto-fix
```

Base config (`biome.json`):

```json
{
	"linter": { "enabled": true, "rules": { "recommended": true } },
	"formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2 },
	"javascript": { "formatter": { "quoteStyle": "single", "semicolons": "always" } }
}
```

---

## Main dependencies

### Production

| Package           | Version | Use                                                                          |
| ----------------- | ------- | ---------------------------------------------------------------------------- |
| `commander`       | ^12     | CLI framework                                                                |
| `better-sqlite3`  | ^9      | Synchronous SQLite (core store)                                              |
| `@node-rs/xxhash` | ^2      | XXH3 hashing for freshness checks (native bindings, ~10x faster than SHA256) |
| `chokidar`        | ^4      | File watcher (native ESM in v4)                                              |
| `simple-git`      | ^3      | Git operations (branch name, remote URL, diff)                               |

### Development

| Package                 | Version | Use           |
| ----------------------- | ------- | ------------- |
| `typescript`            | ^5      | Compiler      |
| `vitest`                | ^2      | Test runner   |
| `@biomejs/biome`        | ^1      | Lint + format |
| `@types/better-sqlite3` | ^7      | SQLite types  |
| `@types/node`           | ^20     | Node.js types |

### Phase 2+ (do not install now)

| Package                     | Future use                        |
| --------------------------- | --------------------------------- |
| `sqlite-vec`                | Vector store (Layer 1)            |
| `onnxruntime-node`          | Bundled ONNX embeddings (Layer 1) |
| `node-tree-sitter`          | AST parsing (Layer 2)             |
| `@modelcontextprotocol/sdk` | MCP server (Phase 3)              |

---

## package.json

```json
{
	"name": "cross-context",
	"version": "0.1.0",
	"description": "Your codebase, remembered — across every AI session.",
	"type": "module",
	"bin": {
		"xctx": "./dist/cli.js"
	},
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"files": ["dist"],
	"scripts": {
		"build": "tsc",
		"dev": "node --loader ts-node/esm src/cli.ts",
		"test": "vitest run",
		"test:watch": "vitest",
		"test:coverage": "vitest run --coverage",
		"lint": "biome check .",
		"lint:fix": "biome check --write .",
		"typecheck": "tsc --noEmit"
	},
	"engines": {
		"node": ">=20"
	}
}
```

---

## tsconfig.json

```json
{
	"compilerOptions": {
		"target": "ES2022",
		"module": "NodeNext",
		"moduleResolution": "NodeNext",
		"outDir": "dist",
		"rootDir": "src",
		"strict": true,
		"declaration": true,
		"declarationMap": true,
		"sourceMap": true,
		"esModuleInterop": true,
		"skipLibCheck": true
	},
	"include": ["src"],
	"exclude": ["node_modules", "dist", "tests"]
}
```

---

## File structure

```
xctx/
  src/
    cli.ts                    # entry point: registers Program and all commands
    commands/
      init.ts                 # xctx init
      feat.ts                 # xctx feat *
      install.ts              # xctx install <agent>
      config.ts               # xctx config get|set
      update.ts               # xctx update (Phase 2+)
      search.ts               # xctx search (Phase 2+)
      graph.ts                # xctx graph (Phase 3+)
    core/
      feat/
        store.ts              # FeatStore: events.jsonl read/write
        renderer.ts           # renderContext(): events → context.md string
        active.ts             # getActiveFeat(), setActiveFeat()
        types.ts              # FeatureEvent, FeatureContext, LinkedFile, etc.
      project.ts              # resolveProjectId(): git remote → xxh3 hash
      paths.ts                # getPaths(): returns all ~/.xctx/ paths
      error.ts                # XctxError, handleError(), exit codes
    integrations/
      agents/
        claude.ts             # generates CLAUDE.md snippet + installs skill
        codex.ts              # generates AGENTS.md
        copilot.ts            # generates .github/copilot-instructions.md
        cursor.ts             # generates .cursorrules
    types.ts                  # publicly exported types
  tests/
    core/
      feat/
        store.test.ts
        renderer.test.ts
        active.test.ts
      project.test.ts
      paths.test.ts
    commands/
      feat.test.ts
      init.test.ts
  dist/                       # build output (gitignored)
  docs/
  package.json
  tsconfig.json
  biome.json
  CLAUDE.md
  README.md
  .gitignore
```

---

## Code conventions

### Imports

```typescript
// Always use .js extension (NodeNext module resolution)
import { FeatStore } from './core/feat/store.js';
import type { FeatureEvent } from './core/feat/types.js';
```

### Errors

```typescript
// Never call process.exit() directly — throw XctxError
import { XctxError } from './core/error.js';
throw new XctxError('Project not initialized. Run `xctx init` first.', 1);
```

### Async

```typescript
// Top-level await is allowed in ESM
// Commander actions must be async and use try/catch
.action(async (name, opts) => {
  try {
    await doSomething();
  } catch (e) {
    handleError(e);
  }
})
```

### Types

```typescript
// Prefer type aliases over interfaces for data shapes
type FeatureEvent = {
	ts: number;
	type: 'decision' | 'blocker' | 'file_linked' | 'status' | 'note';
	text?: string;
	path?: string;
	resolved?: boolean;
	author?: string;
};
```
