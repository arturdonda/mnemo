# Tasks — Phase 1: FEAT Context Cache

**Goal:** Functional CLI to create and maintain feature context, with a Claude Code Skill.  
**Done when:** `mnemo init`, all `mnemo feat *` commands, and `mnemo install claude` work end-to-end.

Embedding layers (Phase 2) and structural graph (Phase 3) are **out of scope for this phase**.

---

## How to use this file

- Mark tasks as `[x]` when complete
- Add implementation notes below a task if relevant
- Do not reorder without reason — the sequence is intentional (dependencies)

---

## Block 1 — Project setup

### T001 — Initialize package.json and install dependencies

- [x] Create `package.json` per spec in `docs/STACK.md`
- [x] `npm install commander better-sqlite3 @node-rs/xxhash chokidar simple-git`
- [x] `npm install -D typescript vitest @biomejs/biome @types/better-sqlite3 @types/node`
- [x] Create `tsconfig.json` per spec in `docs/STACK.md`
- [x] Create `biome.json` per spec in `docs/STACK.md`
- [x] Create `.gitignore` — done

**Done when:** `npm run typecheck` passes with no errors on an empty project.

---

### T002 — Entry point and command structure

- [x] Create `src/cli.ts` with Commander Program registering all command groups
- [x] Create `src/commands/feat.ts` with empty subcommands (no logic yet)
- [x] Create `src/commands/init.ts` empty
- [x] Create `src/commands/install.ts` empty
- [x] Create `src/commands/config.ts` empty
- [x] Create `src/core/error.ts` with `MnemoError` and `handleError()`

**Done when:** `mnemo --help` lists commands; `mnemo feat --help` lists subcommands.

---

## Block 2 — Core: paths and project identity

### T003 — Paths: `~/.mnemo/` directory structure

- [x] Create `src/core/paths.ts`
- [x] Implement `getPaths(projectId: string)` returning all relevant paths
- [x] Implement `ensurePaths(projectId: string)` creating dirs if they don't exist
- [x] Write tests: `tests/core/paths.test.ts`

```typescript
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

**Done when:** tests pass; dirs are created correctly under `~/.mnemo/`.

---

### T004 — Project identity

- [x] Create `src/core/project.ts`
- [x] Implement `resolveProjectId()`: tries git remote URL, falls back to `cwd()`
- [x] Hash with XXH3 (64-bit, hex, first 16 chars)
- [x] Implement `resolveProjectName()`: directory name or `name` field from package.json
- [x] Implement `assertInitialized()`: checks if `mnemo init` has been run; throws `MnemoError` if not
- [x] Write tests: `tests/core/project.test.ts`

**Done when:** `resolveProjectId()` returns a stable hash for the same project; tests pass.

---

## Block 3 — Core: FEAT store

### T005 — FEAT cache types

- [x] Create `src/core/feat/types.ts` with all types:

```typescript
type EventType = 'feat_created' | 'decision' | 'blocker' | 'blocker_resolved' | 'file_linked' | 'file_unlinked' | 'status' | 'note' | 'feat_done';

type FeatureEvent = {
	ts: number; // unix timestamp ms
	type: EventType;
	text?: string;
	path?: string; // for file_linked / file_unlinked
	reason?: string; // for file_linked
	author?: string; // 'user' | 'claude' | 'codex' | agent name
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

**Done when:** file compiles without errors.

---

### T006 — FeatStore: events.jsonl read/write

- [x] Create `src/core/feat/store.ts`
- [x] `appendEvent(projectId, featName, event)`: appends to events.jsonl + regenerates context.md
- [x] `readEvents(projectId, featName)`: reads and parses events.jsonl
- [x] `buildContext(events)`: reduces events into `FeatureContext`
- [x] `listFeats(projectId)`: lists all features for a project
- [x] `featExists(projectId, featName)`: boolean
- [x] Write tests: `tests/core/feat/store.test.ts`

**Done when:** append and read work; `buildContext` returns correct state for a test event sequence.

---

### T007 — Renderer: generate context.md

- [ ] Create `src/core/feat/renderer.ts`
- [ ] `renderContext(context: FeatureContext): string`: generates formatted markdown
- [ ] Sections: header, Relevant Files, Decisions, Current Status, Blockers, Notes
- [ ] Resolved blockers appear in a separate "Resolved Blockers" section (omit section if none)
- [ ] Write tests: `tests/core/feat/renderer.test.ts` with snapshots

**Done when:** `renderContext` output matches the example in `docs/ARCHITECTURE.md`.

---

### T008 — Active feat tracking

- [ ] Create `src/core/feat/active.ts`
- [ ] `getActiveFeat(projectId)`: reads `active_feat` file; returns `null` if not present
- [ ] `setActiveFeat(projectId, featName)`: writes `active_feat` file
- [ ] `clearActiveFeat(projectId)`: removes `active_feat` file
- [ ] Write tests: `tests/core/feat/active.test.ts`

**Done when:** tests pass.

---

## Block 4 — CLI commands

### T009 — `mnemo init`

- [ ] Implement in `src/commands/init.ts`
- [ ] Create `~/.mnemo/projects/{id}/` structure via `ensurePaths()`
- [ ] Write `meta.json` with project name and path
- [ ] Install `post-commit` git hook in `.git/hooks/`
- [ ] Idempotent: does not fail if already initialized
- [ ] Output: confirmation with project ID and path

**Done when:** `mnemo init` runs without errors; `.git/hooks/post-commit` created; re-running is safe.

---

### T010 — `mnemo feat start <name>`

- [ ] Validate project is initialized (`assertInitialized()`)
- [ ] Create feat directory via `ensurePaths()`
- [ ] Write initial `meta.json`
- [ ] Append `feat_created` event
- [ ] Set as active feat via `setActiveFeat()`
- [ ] Auto-detect current branch via `simple-git` and save to meta if available
- [ ] Output: confirmation with feat name and branch

**Done when:** `mnemo feat start payment-flow` creates the structure and sets it as active.

---

### T011 — `mnemo feat list`

- [ ] List all feats for the project
- [ ] Show: name, status, branch, last updated
- [ ] Highlight active feat with visual indicator (`→` or `*`)
- [ ] Show friendly empty message if no feats exist

**Done when:** lists feats with correct active indicator.

---

### T012 — `mnemo feat switch <name>`

- [ ] Validate feat exists
- [ ] Update `active_feat`
- [ ] Output: confirmation

**Done when:** switch correctly changes the active feat.

---

### T013 — `mnemo feat context [name]`

- [ ] No argument: uses active feat; error if none active
- [ ] With argument: uses specified feat
- [ ] Reads events.jsonl → `buildContext()` → `renderContext()` → stdout
- [ ] Output is pure markdown (no extra decoration) — for agent consumption via pipe

**Done when:** `mnemo feat context | cat` prints clean markdown.

---

### T014 — `mnemo feat decision "<text>"`

- [ ] Uses active feat or optional `--feat <name>`
- [ ] Appends `decision` event with timestamp and `author: 'user'`
- [ ] Regenerates `context.md`
- [ ] Output: confirmation with truncated text

**Done when:** decision appears in `mnemo feat context`.

---

### T015 — `mnemo feat blocker "<text>"`

- [ ] Appends `blocker` event
- [ ] Regenerates `context.md`
- [ ] Updates feat status to `blocked` if it was `in-progress`
- [ ] Output: confirmation

**Done when:** blocker appears in the Blockers section of `mnemo feat context`.

---

### T016 — `mnemo feat blocker resolve "<text>"`

- [ ] Match by substring against active blocker text
- [ ] Appends `blocker_resolved` event
- [ ] If no more active blockers, reverts status to `in-progress`
- [ ] Regenerates `context.md`
- [ ] Output: confirmation or error if no matching blocker found

**Done when:** blocker disappears from active Blockers section after resolve.

---

### T017 — `mnemo feat link-file <path> [--reason "<text>"]`

- [ ] Validate file exists in the project (relative to CWD)
- [ ] Normalize path to be relative to git repo root
- [ ] Appends `file_linked` event
- [ ] Regenerates `context.md`
- [ ] Output: confirmation

**Done when:** file appears in Relevant Files in `mnemo feat context`.

---

### T018 — `mnemo feat unlink-file <path>`

- [ ] Appends `file_unlinked` event
- [ ] Regenerates `context.md`
- [ ] Output: confirmation or warning if file was not linked

**Done when:** file disappears from Relevant Files after unlink.

---

### T019 — `mnemo feat status "<text>"`

- [ ] Appends `status` event
- [ ] Regenerates `context.md`
- [ ] Output: confirmation

**Done when:** Current Status updated in `mnemo feat context`.

---

### T020 — `mnemo feat note "<text>"`

- [ ] Appends `note` event
- [ ] Regenerates `context.md`
- [ ] Output: confirmation

**Done when:** note appears in the Notes section.

---

### T021 — `mnemo feat done`

- [ ] Appends `feat_done` event
- [ ] Updates `meta.json` status to `done`
- [ ] Clears active feat if this was the active feat
- [ ] Regenerates `context.md`
- [ ] Output: confirmation

**Done when:** feat shows as `done` in `mnemo feat list`.

---

## Block 5 — Agent integration

### T022 — Claude Code Skill

- [ ] Create `src/integrations/agents/claude.ts`
- [ ] Generate skill file content for `~/.claude/skills/mnemo.md`
- [ ] Skill exposes: `/mnemo-context`, `/mnemo-decision`, `/mnemo-blocker`, `/mnemo-note`
- [ ] Each skill command runs the corresponding CLI command via shell and injects output

**Skill content:**

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

**Done when:** skill file generated with correct content.

---

### T023 — `mnemo install claude`

- [ ] Implement in `src/commands/install.ts`
- [ ] Copy skill to `~/.claude/skills/mnemo.md`
- [ ] Append Mnemo block to project's `CLAUDE.md` (create if not present)
- [ ] Idempotent: does not duplicate if already installed
- [ ] Output: list of created/updated files

**Block appended to project CLAUDE.md:**

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

**Done when:** `mnemo install claude` creates skill and updates CLAUDE.md; re-running is safe.

---

## Block 6 — Polish and integration tests

### T024 — End-to-end integration tests

- [ ] Create `tests/e2e/feat-flow.test.ts`
- [ ] Test full flow: init → feat start → decision → blocker → resolve → context
- [ ] Use a temporary directory for `~/.mnemo/` during tests
- [ ] Clean up after each test

**Done when:** full flow passes in tests.

---

### T025 — Error handling and UX

- [ ] Clear error messages for all common cases:
  - Project not initialized
  - Feat not found
  - No active feat
  - File not found for link
- [ ] `mnemo --version` returns version from package.json
- [ ] All commands have descriptive `--help`

**Done when:** every error has an actionable message (e.g. "Run `mnemo init` to initialize this project.").

---

## Progress summary

```
Block 1 — Setup:        T001 T002
Block 2 — Core infra:   T003 T004
Block 3 — FEAT store:   T005 T006 T007 T008
Block 4 — CLI commands: T009 T010 T011 T012 T013 T014 T015 T016 T017 T018 T019 T020 T021
Block 5 — Integration:  T022 T023
Block 6 — Polish:       T024 T025
```

**Total Phase 1: 25 tasks**

---

## Phase 2+ backlog (do not implement now)

- Semantic index: sqlite-vec + ONNX embeddings + `mnemo search`
- Git hook auto-switch feat by branch name
- `mnemo install codex` / `mnemo install copilot` / `mnemo install cursor`
- `mnemo config get|set`
- `mnemo status` (index health)
- Structural graph (Phase 3)
- MCP server (Phase 3)
