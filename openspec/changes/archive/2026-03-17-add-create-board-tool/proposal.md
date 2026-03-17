## Why

The pattern studio can currently add boards only from presets, which is too coarse once users want to place custom parts directly inside the 3D workspace. The first implementation put create-board on the 2D canvas, but that does not match the reference interaction model in `lib/editor/docs/create-wall.md`. We need the create tool to live in the 3D editor viewport and follow the same tool-driven, grid-snapped, two-click flow as wall creation, while still committing `Board` data instead of walls.

## What Changes

- Move the interactive create-board tool from the 2D canvas to the 3D workspace.
- Add a tool-driven, two-click 3D creation flow with grid snapping and default 45-degree direction snapping.
- Show a live 3D cursor and board preview while drawing and allow cancelling the in-progress create action.
- Commit a new board into the current document after the second click, using board data rather than wall data.
- Keep existing preset-based board creation available; this change adds a second creation path instead of replacing presets.

## Capabilities

### New Capabilities
- `pattern-studio-create-board`: Defines the interactive 3D board-creation tool, snapping rules, preview behavior, and board commit flow in the pattern studio editor.

### Modified Capabilities

## Impact

- Affected code: `apps/web/src/components/pattern-studio/board-preview-3d.tsx`, `apps/web/src/components/pattern-studio/editor-page.tsx`, and likely small supporting utilities in `apps/web/src/lib/pattern-studio.ts`.
- Affected UX: 3D workspace interactions, tool-driven board creation flow, and grid-based placement.
- Dependencies: no new dependencies expected; this should build on the current WebGPU 3D view, selection flow, and existing board schema.
