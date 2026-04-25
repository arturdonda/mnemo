# Tasks — Phase 1: FEAT Context Cache

**Objetivo do Phase 1:** CLI funcional para criar e manter contexto de features, com Skill para Claude Code.  
**Critério de conclusão do Phase 1:** `mnemo init`, todos os `mnemo feat *`, e `mnemo install claude` funcionando end-to-end.

Layers de embedding (Phase 2) e grafo estrutural (Phase 3) **não fazem parte deste phase**.

---

## Como usar este arquivo

- Marque tarefas como `[x]` ao concluir
- Adicione notas de implementação sob cada tarefa se relevante
- Não mude a ordem ou estrutura sem motivo — a sequência é intencional (dependências)

---

## Bloco 1 — Setup do projeto

### T001 — Inicializar package.json e instalar dependências

- [ ] Criar `package.json` conforme spec em `docs/STACK.md`
- [ ] `npm install commander better-sqlite3 @node-rs/xxhash chokidar simple-git`
- [ ] `npm install -D typescript vitest @biomejs/biome @types/better-sqlite3 @types/node`
- [ ] Criar `tsconfig.json` conforme spec em `docs/STACK.md`
- [ ] Criar `biome.json` conforme spec em `docs/STACK.md`
- [ ] Criar `.gitignore` (`node_modules/`, `dist/`)

**Done when:** `npm run typecheck` passa sem erros em projeto vazio.

---

### T002 — Entry point e estrutura de comandos

- [ ] Criar `src/cli.ts` com Program do Commander registrando os command groups
- [ ] Criar `src/commands/feat.ts` com subcommands vazios (sem lógica ainda)
- [ ] Criar `src/commands/init.ts` vazio
- [ ] Criar `src/commands/install.ts` vazio
- [ ] Criar `src/commands/config.ts` vazio
- [ ] Criar `src/core/error.ts` com `MnemoError` e `handleError()`

**Done when:** `mnemo --help` lista os comandos; `mnemo feat --help` lista subcommands.

---

## Bloco 2 — Core: paths e identidade do projeto

### T003 — Paths: estrutura de diretórios `~/.mnemo/`

- [ ] Criar `src/core/paths.ts`
- [ ] Implementar `getPaths(projectId: string)` retornando todos os caminhos relevantes
- [ ] Implementar `ensurePaths(projectId: string)` criando dirs se não existem
- [ ] Escrever testes: `tests/core/paths.test.ts`

```typescript
// Interface esperada
type MnemoPaths = {
	root: string; // ~/.mnemo
	projectRoot: string; // ~/.mnemo/projects/{id}
	featsDir: string; // ~/.mnemo/projects/{id}/feats
	activeFeatFile: string; // ~/.mnemo/projects/{id}/active_feat
	projectMeta: string; // ~/.mnemo/projects/{id}/meta.json
	featDir: (name: string) => string;
	eventsFile: (name: string) => string;
	contextFile: (name: string) => string;
	featMeta: (name: string) => string;
};
```

**Done when:** testes passam; dirs são criados corretamente em `~/.mnemo/`.

---

### T004 — Identidade do projeto

- [ ] Criar `src/core/project.ts`
- [ ] Implementar `resolveProjectId()`: tenta git remote URL, fallback para `cwd()`
- [ ] Hash com XXH3 (64-bit, hex, primeiros 16 chars)
- [ ] Implementar `resolveProjectName()`: nome do diretório ou campo `name` do package.json
- [ ] Implementar `assertInitialized()`: verifica se `mnemo init` já foi rodado; lança `MnemoError` se não
- [ ] Escrever testes: `tests/core/project.test.ts`

**Done when:** `resolveProjectId()` retorna hash estável para o mesmo projeto; testes passam.

---

## Bloco 3 — Core: FEAT store

### T005 — Tipos do FEAT cache

- [ ] Criar `src/core/feat/types.ts` com todos os tipos:

```typescript
type EventType = 'feat_created' | 'decision' | 'blocker' | 'blocker_resolved' | 'file_linked' | 'file_unlinked' | 'status' | 'note' | 'feat_done';

type FeatureEvent = {
	ts: number; // unix timestamp ms
	type: EventType;
	text?: string;
	path?: string; // para file_linked / file_unlinked
	reason?: string; // para file_linked
	author?: string; // 'user' | 'claude' | 'codex' | nome do agente
};

type FeatureMeta = {
	id: string;
	name: string;
	branch?: string;
	status: 'in-progress' | 'blocked' | 'done';
	createdAt: number;
	updatedAt: number;
};

type FeatureContext = {
	meta: FeatureMeta;
	files: Array<{ path: string; reason?: string }>;
	decisions: Array<{ text: string; ts: number; author?: string }>;
	blockers: Array<{ text: string; resolved: boolean; ts: number }>;
	notes: Array<{ text: string; ts: number }>;
	currentStatus?: string;
};
```

**Done when:** arquivo compila sem erros.

---

### T006 — FeatStore: leitura e escrita de events.jsonl

- [ ] Criar `src/core/feat/store.ts`
- [ ] `appendEvent(projectId, featName, event)`: append ao events.jsonl + atualiza context.md
- [ ] `readEvents(projectId, featName)`: lê e parseia events.jsonl
- [ ] `buildContext(events)`: reduz eventos para `FeatureContext`
- [ ] `listFeats(projectId)`: lista todas as features de um projeto
- [ ] `featExists(projectId, featName)`: boolean
- [ ] Escrever testes: `tests/core/feat/store.test.ts`

**Done when:** append e leitura funcionam; `buildContext` retorna estado correto para sequência de eventos de teste.

---

### T007 — Renderer: gerar context.md

- [ ] Criar `src/core/feat/renderer.ts`
- [ ] `renderContext(context: FeatureContext): string`: gera markdown formatado
- [ ] Seções: header, Relevant Files, Decisions, Current Status, Blockers, Notes
- [ ] Blockers resolvidos aparecem em seção separada "Resolved Blockers" (ou omitidos se nenhum)
- [ ] Escrever testes: `tests/core/feat/renderer.test.ts` com snapshots

**Done when:** `renderContext` gera markdown idêntico ao exemplo em `docs/ARCHITECTURE.md`.

---

### T008 — Active feat tracking

- [ ] Criar `src/core/feat/active.ts`
- [ ] `getActiveFeat(projectId)`: lê `active_feat` file; retorna `null` se não existe
- [ ] `setActiveFeat(projectId, featName)`: escreve `active_feat` file
- [ ] `clearActiveFeat(projectId)`: remove `active_feat` file
- [ ] Escrever testes: `tests/core/feat/active.test.ts`

**Done when:** testes passam.

---

## Bloco 4 — Comandos CLI

### T009 — `mnemo init`

- [ ] Implementar em `src/commands/init.ts`
- [ ] Cria estrutura `~/.mnemo/projects/{id}/` via `ensurePaths()`
- [ ] Escreve `meta.json` com nome e caminho do projeto
- [ ] Instala git hook `post-commit` em `.git/hooks/`
- [ ] Idempotente: não falha se já inicializado
- [ ] Output: confirmação com project ID e caminho

**Done when:** `mnemo init` roda sem erros; `.git/hooks/post-commit` criado; re-rodar é seguro.

---

### T010 — `mnemo feat start <name>`

- [ ] Validar que projeto está inicializado (`assertInitialized()`)
- [ ] Criar diretório da feat via `ensurePaths()`
- [ ] Escrever `meta.json` inicial
- [ ] Appender evento `feat_created`
- [ ] Setar como feat ativa via `setActiveFeat()`
- [ ] Auto-detectar branch atual via `simple-git` e salvar em meta se disponível
- [ ] Output: confirmação com nome da feat e branch

**Done when:** `mnemo feat start payment-flow` cria estrutura e seta como ativa.

---

### T011 — `mnemo feat list`

- [ ] Listar todas as feats do projeto
- [ ] Mostrar: nome, status, branch, última atualização
- [ ] Destacar feat ativa com indicador visual (`→` ou `*`)
- [ ] Output vazio com mensagem amigável se nenhuma feat existe

**Done when:** lista feats com indicador correto da ativa.

---

### T012 — `mnemo feat switch <name>`

- [ ] Validar que a feat existe
- [ ] Atualizar `active_feat`
- [ ] Output: confirmação

**Done when:** switch muda a feat ativa corretamente.

---

### T013 — `mnemo feat context [name]`

- [ ] Sem argumento: usa feat ativa; erro se nenhuma ativa
- [ ] Com argumento: usa feat especificada
- [ ] Lê events.jsonl → `buildContext()` → `renderContext()` → stdout
- [ ] Output é markdown puro (sem decoração extra) — para consumo por agentes via pipe

**Done when:** `mnemo feat context | cat` imprime markdown limpo.

---

### T014 — `mnemo feat decision "<text>"`

- [ ] Usa feat ativa ou `--feat <name>` opcional
- [ ] Appender evento `decision` com timestamp e `author: 'user'`
- [ ] Regenerar `context.md`
- [ ] Output: confirmação com texto truncado

**Done when:** decisão aparece em `mnemo feat context`.

---

### T015 — `mnemo feat blocker "<text>"`

- [ ] Appender evento `blocker`
- [ ] Regenerar `context.md`
- [ ] Atualizar status da feat para `blocked` se estava `in-progress`
- [ ] Output: confirmação

**Done when:** blocker aparece na seção Blockers em `mnemo feat context`.

---

### T016 — `mnemo feat blocker resolve "<text>"`

- [ ] Match por substring no texto dos blockers ativos
- [ ] Appender evento `blocker_resolved`
- [ ] Se não há mais blockers ativos, voltar status para `in-progress`
- [ ] Regenerar `context.md`
- [ ] Output: confirmação ou erro se nenhum blocker encontrado

**Done when:** blocker some da seção Blockers ativos após resolve.

---

### T017 — `mnemo feat link-file <path> [--reason "<text>"]`

- [ ] Validar que o arquivo existe no projeto (relativo ao CWD)
- [ ] Normalizar path para relativo à raiz do repo git
- [ ] Appender evento `file_linked`
- [ ] Regenerar `context.md`
- [ ] Output: confirmação

**Done when:** arquivo aparece em Relevant Files em `mnemo feat context`.

---

### T018 — `mnemo feat unlink-file <path>`

- [ ] Appender evento `file_unlinked`
- [ ] Regenerar `context.md`
- [ ] Output: confirmação ou aviso se arquivo não estava linked

**Done when:** arquivo some de Relevant Files após unlink.

---

### T019 — `mnemo feat status "<text>"`

- [ ] Appender evento `status`
- [ ] Regenerar `context.md`
- [ ] Output: confirmação

**Done when:** Current Status atualizado em `mnemo feat context`.

---

### T020 — `mnemo feat note "<text>"`

- [ ] Appender evento `note`
- [ ] Regenerar `context.md`
- [ ] Output: confirmação

**Done when:** nota aparece na seção Notes.

---

### T021 — `mnemo feat done`

- [ ] Appender evento `feat_done`
- [ ] Atualizar `meta.json` status para `done`
- [ ] Limpar feat ativa se era a feat ativa
- [ ] Regenerar `context.md`
- [ ] Output: confirmação

**Done when:** feat aparece como `done` em `mnemo feat list`.

---

## Bloco 5 — Agent integration (Phase 1)

### T022 — Claude Code Skill

- [ ] Criar `src/integrations/agents/claude.ts`
- [ ] Gerar conteúdo do arquivo de skill `~/.claude/skills/mnemo.md`
- [ ] Skill deve expor: `/mnemo-context`, `/mnemo-decision`, `/mnemo-blocker`, `/mnemo-note`
- [ ] Cada comando da skill executa o CLI correspondente via shell e injeta output

**Conteúdo da skill:**

```markdown
# mnemo — codebase memory

Run `mnemo feat context` at the start of any session to load the current feature context.

## Commands

/mnemo-context — Load current feature context into this session
Runs: mnemo feat context

/mnemo-decision <text> — Record an architectural decision
Runs: mnemo feat decision "<text>"

/mnemo-blocker <text> — Record a blocker
Runs: mnemo feat blocker "<text>"

/mnemo-note <text> — Record a note
Runs: mnemo feat note "<text>"
```

**Done when:** arquivo de skill criado com conteúdo correto.

---

### T023 — `mnemo install claude`

- [ ] Implementar em `src/commands/install.ts`
- [ ] Copiar/instalar skill em `~/.claude/skills/mnemo.md`
- [ ] Append bloco Mnemo em `CLAUDE.md` do projeto (criar se não existe)
- [ ] Idempotente: não duplica se já instalado
- [ ] Output: lista de arquivos criados/atualizados

**Bloco a appendar no CLAUDE.md do projeto:**

```markdown
## Mnemo — Codebase Memory

This project uses Mnemo for persistent context across AI sessions.

At the start of each session:

1. Run `mnemo feat context` to load the current feature context
2. Use `mnemo search "<query>"` before exploring unfamiliar code (Phase 2)

When making architectural decisions, run:
`mnemo feat decision "<your decision and rationale>"`

When hitting a blocker:
`mnemo feat blocker "<description>"`
```

**Done when:** `mnemo install claude` cria skill e atualiza CLAUDE.md; re-rodar é seguro.

---

## Bloco 6 — Polish e testes de integração

### T024 — Testes de integração end-to-end

- [ ] Criar `tests/e2e/feat-flow.test.ts`
- [ ] Testar fluxo completo: init → feat start → decision → blocker → resolve → context
- [ ] Usar diretório temporário para `~/.mnemo/` durante testes
- [ ] Limpar após cada teste

**Done when:** fluxo completo passa nos testes.

---

### T025 — Error handling e UX

- [ ] Mensagens de erro claras para todos os casos comuns:
  - Projeto não inicializado
  - Feat não encontrada
  - Nenhuma feat ativa
  - Arquivo não encontrado para link
- [ ] `mnemo --version` retorna versão do package.json
- [ ] Todos os comandos têm `--help` descritivo

**Done when:** cada erro tem mensagem acionável ("Run `mnemo init` to initialize this project.").

---

## Resumo de progresso

```
Bloco 1 — Setup:          T001 T002
Bloco 2 — Core infra:     T003 T004
Bloco 3 — FEAT store:     T005 T006 T007 T008
Bloco 4 — Comandos CLI:   T009 T010 T011 T012 T013 T014 T015 T016 T017 T018 T019 T020 T021
Bloco 5 — Integração:     T022 T023
Bloco 6 — Polish:         T024 T025
```

**Total Phase 1: 25 tasks**

---

## Backlog Phase 2+ (não implementar agora)

- Semantic index: sqlite-vec + ONNX embeddings + `mnemo search`
- Git hook auto-switch de feat por branch
- `mnemo install codex` / `mnemo install copilot` / `mnemo install cursor`
- `mnemo config get|set`
- `mnemo status` (saúde dos índices)
- Structural graph (Phase 3)
- MCP server (Phase 3)
