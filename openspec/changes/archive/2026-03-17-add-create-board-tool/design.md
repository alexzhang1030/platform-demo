## Context

The reference `create-wall` flow in `lib/editor/docs/create-wall.md` is a tool-driven, two-step 3D drawing interaction: first click sets an anchor, pointer movement drives a snapped preview, second click commits. The pattern studio editor already has a WebGPU-based 3D workspace with board selection and drag support, but it does not have a dedicated 3D creation tool. New boards can only be inserted from presets, which bypasses spatial authoring entirely.

This change is scoped to `apps/web`. The goal is to borrow the interaction model from wall creation, not the wall-specific data model or geometry system. Here, the output is a new rectangular board in the document, not a wall node. The board is created on the ground plane inside the 3D viewport, with a fixed default board depth and thickness suitable for immediate further editing.

## Goals / Non-Goals

**Goals:**
- Add a create-board tool with an idle/drawing two-state interaction model in the 3D viewport.
- Snap board creation to the existing 3D workspace grid and support optional 45-degree direction snapping.
- Render a live 3D cursor and board preview while drawing so the user can see the board footprint before commit.
- Commit a valid `Board` object into the current `PatternDocument` after the second click.
- Keep the implementation local to the current pattern studio editor structure.

**Non-Goals:**
- Recreate the wall node schema, wall system, or mitering pipeline from the reference editor.
- Support arbitrary polygon drawing or editable width handles in the first iteration.
- Replace the existing preset buttons for board creation.
- Add a generalized tool/event-bus system if a smaller local state model is sufficient.

## Decisions

### 1. Use a local two-step create state inside `board-preview-3d.tsx`
The 3D viewport will keep a small local create-board state with `idle` and `drawing` phases instead of introducing a generalized tool framework immediately.

Why:
- The requested feature is narrow and can fit the current editor architecture.
- A local state machine is enough to model first-click, preview, second-click, and cancel.
- The 3D viewport already owns the plane raycast data needed for snapped create interactions.

Alternative considered:
- Introduce a full reusable tool/event-bus system like the reference editor. Rejected because it is too large for a first create-board pass.

### 2. Create rectangular boards from a snapped 3D span
The create tool will interpret the first and second points as a snapped span on the ground plane, then commit a rectangular board aligned to that span with a fixed default board depth.

Why:
- It matches the reference wall-tool mental model better than diagonal-corner rectangle drawing.
- It is consistent with the current board schema, which already stores a transform plus a rectangular outline.
- It provides immediate utility without requiring width editing in the first pass.

Alternative considered:
- Keep the previous 2D diagonal-corner rectangle tool. Rejected because it diverges from the requested 3D create-wall-style workflow.

### 3. Reuse the existing 3D ground-plane interaction surface
The create interaction will live on the current WebGPU 3D editor surface. Cursor position, snapping, preview, and commit will be derived from ground-plane ray intersections and a dedicated invisible hit plane.

Why:
- The user explicitly wants this interaction in 3D first.
- The 3D viewport already computes plane intersections for board drag and grid feedback.
- A dedicated hit plane keeps create interactions stable even when the cursor is over existing boards.

Alternative considered:
- Continue using direct object hits only. Rejected because existing boards would intercept clicks and make tool behavior inconsistent.

### 4. Keep snapping simple and predictable
The create tool will snap to the existing workspace grid and apply 45-degree direction snapping by default, with Shift temporarily disabling angle snapping.

Why:
- This is the most valuable part of the reference interaction model.
- It makes drawn boards easier to align with other parts.

Alternative considered:
- Only snap to the grid and skip angle snapping. Rejected because the user explicitly pointed to the reference `create-wall` behavior.

### 5. Disable conflicting 3D interactions while create mode is active
The create tool will suppress board drag/select handlers for normal left-click interaction and reserve left-click for tool input, while still allowing deliberate camera navigation via the existing pan/orbit mappings.

Why:
- Create mode should feel deterministic and not compete with board drag.
- The current viewport already has camera and selection controls that need explicit precedence rules.

Alternative considered:
- Fully disable all camera controls in create mode. Rejected because it would make navigation too rigid in larger documents.

## Risks / Trade-offs

- [A local create-board state can add complexity to `board-preview-3d.tsx`] → Mitigation: keep the state machine small and isolate helper functions for snapping, preview, and commit.
- [A fixed default board depth may not match every user's intent] → Mitigation: choose a practical default and keep preset buttons for fast alternatives.
- [Preview, selection, and camera interactions can conflict] → Mitigation: add an explicit hit plane and short-circuit normal board drag/select handlers while the create tool is active.

## Migration Plan

1. Move create-board state and snapping helpers into the 3D viewport.
2. Add a ground-plane hit target, cursor marker, and live 3D board preview.
3. Commit created boards into the document and selection flow from the 3D interaction path.
4. Remove the temporary 2D create implementation from the editor canvas.
5. Validate snapping, cancel, preview, commit, and interaction conflict handling.

## Open Questions

- Whether the default board depth should remain fixed or eventually be derived from the current selection/material preset.
- Whether a future iteration should add width handles or a second adjustment step after the 3D span is committed.
