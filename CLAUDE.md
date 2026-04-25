# Mnemo — Agent Context

## O que é

Mnemo é um CLI tool (`mnemo`) que dá memória persistente de codebase para agentes de IA. Resolve o problema de cold-start: agentes param de redescobrir o projeto do zero a cada sessão.

Três camadas:

1. **Semantic Index** — embeddings locais para busca por linguagem natural
2. **Structural Graph** — grafo de dependências via Tree-sitter
3. **FEAT Context Cache** — contexto por feature: arquivos, decisões, blockers, status (o diferencial)

## Status atual

**Phase 1 em andamento: FEAT Context Cache**

Foco exclusivo no Layer 3. Layers 1 e 2 são Phase 2 e 3. Não implementar nada fora do escopo do Phase 1 sem aprovação.

Ver tarefas: `docs/TASKS.md`

## Estrutura do projeto

```
mnemo/
  src/
    cli.ts                  # entry point — registra todos os comandos
    commands/               # handlers de comandos CLI (um por grupo)
      feat.ts
      install.ts
      init.ts
      config.ts
    core/
      feat/
        store.ts            # leitura/escrita de events.jsonl
        renderer.ts         # gera context.md a partir dos eventos
        active.ts           # rastreia feat ativa
      project.ts            # identidade do projeto (hash do git remote)
      paths.ts              # ~/.mnemo/ dir structure
    types.ts                # tipos compartilhados (FeatureEvent, etc.)
  tests/
  dist/
  docs/
    PRD.md
    ARCHITECTURE.md
    DECISIONS.md
    STACK.md
    TASKS.md
```

## Como rodar

```bash
npm install
npm run dev -- feat start minha-feature   # executa sem build
npm run build                             # compila para dist/
npm run test                              # vitest
npm run lint                              # biome check
npm run typecheck                         # tsc --noEmit
```

## Convenções

- **ESM only** — `import`/`export`, nunca `require()`
- **TypeScript strict** — sem `any` implícito, sem `!` desnecessário
- **Biome** para lint e format — rodar antes de commitar
- **Erros**: nunca `process.exit()` diretamente; usar o wrapper de erro em `src/core/error.ts`
- **Testes**: um arquivo de teste por módulo (`*.test.ts` ao lado do arquivo)
- **Sem comentários óbvios** — comentar apenas lógica não evidente

## Dados em runtime

```
~/.mnemo/
  config.json
  projects/
    {project-id}/           # sha256(git remote)[0:16]
      meta.json
      feats/
        {feat-name}/
          events.jsonl      # source of truth (append-only)
          context.md        # gerado a partir de events.jsonl
          meta.json
      active_feat           # nome da feat ativa (plain text)
```

## Documentação de referência

| Doc                    | Quando ler                                                 |
| ---------------------- | ---------------------------------------------------------- |
| `docs/PRD.md`          | Para entender o problema e os usuários                     |
| `docs/ARCHITECTURE.md` | Para entender as 3 camadas e decisões técnicas             |
| `docs/DECISIONS.md`    | Para entender o _por quê_ de cada escolha (ADRs D001–D016) |
| `docs/STACK.md`        | Para dependências, versões, e configuração do projeto      |
| `docs/TASKS.md`        | Para saber o que implementar agora (Phase 1)               |

## Regras para agentes

1. **Leia `docs/TASKS.md` antes de escrever qualquer código** — para saber o que está pendente e o que já foi feito
2. **Phase 1 = somente FEAT cache** — não iniciar layers de embedding ou grafo
3. **Antes de criar um arquivo novo**, verifique se já existe algo similar na estrutura acima
4. **Ao completar uma task**, marque como done em `docs/TASKS.md`
5. **Decisões arquiteturais** já tomadas estão em `docs/DECISIONS.md` — não reabrir sem motivo explícito
