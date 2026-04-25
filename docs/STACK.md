# Stack & Technical Setup

## Runtime

| Item          | Versão    | Notas                                            |
| ------------- | --------- | ------------------------------------------------ |
| Node.js       | 20+ (LTS) | Mínimo para ESM nativo e worker_threads estável  |
| TypeScript    | 5.x       | strict mode habilitado                           |
| Module system | ESM       | `"type": "module"` no package.json; sem CommonJS |

---

## CLI Framework

**Commander.js** (`commander`)

Escolhido por: API simples, TypeScript nativo, mínimo boilerplate, sem opinião sobre estrutura de projeto.

```typescript
// Padrão de uso
import { Command } from 'commander'
const program = new Command()
program
  .command('feat')
  .command('start <name>')
  .action(async (name) => { ... })
```

Alternativas descartadas: Yargs (API mais verbosa), Oclif (opinionado demais para MVP).

---

## Test Framework

**Vitest**

Escolhido por: ESM nativo, TypeScript-first sem config extra, compatível com API do Jest, watch mode rápido.

```bash
npm run test          # run all
npm run test:watch    # watch mode
npm run test:coverage # coverage report
```

Convenção: arquivos de teste ao lado do módulo (`store.test.ts` junto de `store.ts`).

---

## Linting & Formatting

**Biome** (`@biomejs/biome`)

Único tool para lint + format. Substitui ESLint + Prettier com configuração mínima.

```bash
npm run lint           # check
npm run lint:fix       # auto-fix
```

Configuração base (`biome.json`):

```json
{
	"linter": { "enabled": true, "rules": { "recommended": true } },
	"formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2 },
	"javascript": { "formatter": { "quoteStyle": "single", "semicolons": "always" } }
}
```

---

## Dependências principais

### Produção

| Pacote            | Versão | Uso                                                                         |
| ----------------- | ------ | --------------------------------------------------------------------------- |
| `commander`       | ^12    | CLI framework                                                               |
| `better-sqlite3`  | ^9     | SQLite síncrono (core store)                                                |
| `@node-rs/xxhash` | ^2     | XXH3 hashing para freshness (bindings nativas, ~10x mais rápido que SHA256) |
| `chokidar`        | ^4     | File watcher (ESM nativo no v4)                                             |
| `simple-git`      | ^3     | Git operations (branch name, remote URL, diff)                              |

### Desenvolvimento

| Pacote                  | Versão | Uso               |
| ----------------------- | ------ | ----------------- |
| `typescript`            | ^5     | Compilador        |
| `vitest`                | ^2     | Test runner       |
| `@biomejs/biome`        | ^1     | Lint + format     |
| `@types/better-sqlite3` | ^7     | Tipos para SQLite |
| `@types/node`           | ^20    | Tipos Node.js     |

### Phase 2+ (não instalar agora)

| Pacote                      | Uso futuro                        |
| --------------------------- | --------------------------------- |
| `sqlite-vec`                | Vector store (Layer 1)            |
| `onnxruntime-node`          | Bundled ONNX embeddings (Layer 1) |
| `node-tree-sitter`          | AST parsing (Layer 2)             |
| `@modelcontextprotocol/sdk` | MCP server (Phase 3)              |

---

## package.json

```json
{
	"name": "mnemo-cli",
	"version": "0.1.0",
	"description": "Your codebase, remembered — across every AI session.",
	"type": "module",
	"bin": {
		"mnemo": "./dist/cli.js"
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

## Estrutura de arquivos

```
mnemo/
  src/
    cli.ts                    # entry: registra Program e todos os commands
    commands/
      init.ts                 # mnemo init
      feat.ts                 # mnemo feat *
      install.ts              # mnemo install <agent>
      config.ts               # mnemo config get|set
      update.ts               # mnemo update (Phase 2+)
      search.ts               # mnemo search (Phase 2+)
      graph.ts                # mnemo graph (Phase 3+)
    core/
      feat/
        store.ts              # FeatStore: leitura/escrita de events.jsonl
        renderer.ts           # renderContext(): events → context.md string
        active.ts             # getActiveFeat(), setActiveFeat()
        types.ts              # FeatureEvent, FeatureContext, LinkedFile, etc.
      project.ts              # resolveProjectId(): git remote → xxh3 hash
      paths.ts                # getPaths(): retorna todos os caminhos ~/.mnemo/
      error.ts                # MnemoError, handleError(), exit codes
    integrations/
      agents/
        claude.ts             # gera CLAUDE.md snippet + instala skill
        codex.ts              # gera AGENTS.md
        copilot.ts            # gera .github/copilot-instructions.md
        cursor.ts             # gera .cursorrules
    types.ts                  # tipos exportados publicamente
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
  dist/                       # output do build (gitignored)
  docs/
  package.json
  tsconfig.json
  biome.json
  CLAUDE.md
  README.md
  .gitignore
```

---

## Convenções de código

### Imports

```typescript
// Sempre com extensão .js (NodeNext module resolution)
import { FeatStore } from './core/feat/store.js';
import type { FeatureEvent } from './core/feat/types.js';
```

### Erros

```typescript
// Nunca process.exit() direto — usar MnemoError
import { MnemoError } from './core/error.js';
throw new MnemoError('Project not initialized. Run `mnemo init` first.', 1);
```

### Async

```typescript
// Top-level await permitido em ESM
// Commander actions devem ser async e usar try/catch
.action(async (name, opts) => {
  try {
    await doSomething()
  } catch (e) {
    handleError(e)
  }
})
```

### Tipos

```typescript
// Preferir types sobre interfaces para data shapes
type FeatureEvent = {
	ts: number;
	type: 'decision' | 'blocker' | 'file_linked' | 'status' | 'note';
	text?: string;
	path?: string;
	resolved?: boolean;
	author?: string;
};
```
