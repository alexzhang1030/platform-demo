# AI-Native Pattern Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic AI-native editor panel that can generate structures from prompts, patch the current design, and show manufacturing checks.

**Architecture:** Introduce a focused AI module in `apps/web/src/lib` for parsing, executing, and checking AI commands. Wire the editor to this module through a small panel component/state flow so UI stays a thin client over deterministic helpers.

**Tech Stack:** React 19, TypeScript, Bun test, existing `@platform-demo/protocol` and `@platform-demo/core` helpers, Tailwind v4 utilities.

---

## File map
- Create: `apps/web/src/lib/pattern-studio-ai.ts` — command types, parser, executor, checks, and run helper.
- Modify: `apps/web/src/lib/pattern-studio.test.ts` — add TDD coverage for parser/executor/checks.
- Modify: `apps/web/src/components/pattern-studio/editor-page.tsx` — add AI Studio panel and event wiring.

### Task 1: Define parser behavior with tests

**Files:**
- Modify: `apps/web/src/lib/pattern-studio.test.ts`
- Create: `apps/web/src/lib/pattern-studio-ai.ts`

- [ ] **Step 1: Write failing tests** for generate, patch, partial, and failed parse cases.
- [ ] **Step 2: Run test command** `cd apps/web && bun test src/lib/pattern-studio.test.ts` and verify failures mention missing AI helpers.
- [ ] **Step 3: Write minimal parser implementation** in `pattern-studio-ai.ts`.
- [ ] **Step 4: Run the same test command** and verify parser tests pass.

### Task 2: Define executor behavior with tests

**Files:**
- Modify: `apps/web/src/lib/pattern-studio.test.ts`
- Create: `apps/web/src/lib/pattern-studio-ai.ts`

- [ ] **Step 1: Write failing tests** for generating a box/tray document and patching dimensions / handle cutout.
- [ ] **Step 2: Run test command** `cd apps/web && bun test src/lib/pattern-studio.test.ts` and verify failures are for executor behavior.
- [ ] **Step 3: Write minimal executor implementation** that builds deterministic boards and updates timestamps.
- [ ] **Step 4: Run the same test command** and verify executor tests pass.

### Task 3: Define manufacturing checks with tests

**Files:**
- Modify: `apps/web/src/lib/pattern-studio.test.ts`
- Create: `apps/web/src/lib/pattern-studio-ai.ts`

- [ ] **Step 1: Write failing tests** for warning conditions and a passing result.
- [ ] **Step 2: Run test command** `cd apps/web && bun test src/lib/pattern-studio.test.ts` and verify failures are for checks behavior.
- [ ] **Step 3: Write minimal checks implementation**.
- [ ] **Step 4: Run the same test command** and verify checks tests pass.

### Task 4: Wire the editor AI panel

**Files:**
- Modify: `apps/web/src/components/pattern-studio/editor-page.tsx`
- Create: `apps/web/src/lib/pattern-studio-ai.ts`

- [ ] **Step 1: Add a focused AI Studio panel UI** with prompt input, quick prompts, parsed command summary, execution steps, and checks.
- [ ] **Step 2: Wire panel actions** to run generate/patch against the current document and update selection.
- [ ] **Step 3: Run typecheck** with `cd apps/web && bun run typecheck`.
- [ ] **Step 4: Run targeted tests** with `cd apps/web && bun test src/lib/pattern-studio.test.ts`.

### Task 5: Final verification

**Files:**
- Modify: `apps/web/src/components/pattern-studio/editor-page.tsx`
- Modify: `apps/web/src/lib/pattern-studio.test.ts`
- Create: `apps/web/src/lib/pattern-studio-ai.ts`

- [ ] **Step 1: Run** `cd apps/web && bun run typecheck`.
- [ ] **Step 2: Run** `cd apps/web && bun test src/lib/pattern-studio.test.ts`.
- [ ] **Step 3: Review changed files** with `git diff -- apps/web/src/components/pattern-studio/editor-page.tsx apps/web/src/lib/pattern-studio.test.ts apps/web/src/lib/pattern-studio-ai.ts`.
