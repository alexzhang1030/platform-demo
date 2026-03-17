---
name: update-how-it-works
description: Update the project's how-it-works documentation after meaningful implementation changes. Use when a code change alters how a feature works internally, adds a new feature worth explaining, changes key data flow or rendering behavior, or makes existing how-it-works docs stale. Especially relevant for changes under apps/web/src/components/pattern-studio and related OpenSpec-backed features.
---

# Update How It Works

Update `how-it-works/` when implementation changes alter the important mechanics of a feature.

## Workflow

1. Identify whether the change crosses the documentation threshold.
   Update docs when the change affects architecture, data flow, rendering, interaction model, performance behavior, or a user-visible feature's implementation strategy.
   Skip docs for tiny styling tweaks, renames, copy edits, or trivial refactors with no change in how the feature works.

2. Map the code change to one or more feature documents.
   Prefer updating an existing file in `how-it-works/`.
   Create a new feature document only when the change introduces a distinct implementation area that is not already covered.

3. Explain the current implementation, not the change history.
   Describe:
   - the goal of the feature
   - the key files
   - the main data flow or rendering flow
   - the important tradeoffs or constraints
   Do not turn the document into a changelog, OpenSpec artifact, or task log.

4. Keep docs split by feature.
   Use one file per feature area, plus `how-it-works/README.md` as the index.
   Prefer names like `camera-framing.md`, `lighting.md`, `pip-workspace.md`.

5. Keep the writing compact.
   Optimize for another engineer reading the repo later and asking, "How does this work?"
   Use short sections and concrete explanations tied to the current code.

## Project Rules

- Write docs under `how-it-works/` only.
- Keep examples and terminology aligned with the current source files.
- Update `how-it-works/README.md` when adding or removing a feature document.
- Prefer explaining the stable implementation principle over incidental constants unless the constant is itself important to how the feature behaves.
