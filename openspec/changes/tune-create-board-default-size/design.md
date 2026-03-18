## Context

The previous change direction generated two flat boards from one create gesture. That is no longer the desired product behavior. The current requirement is:

- create one board
- render it as a standing board in 3D
- snap it to existing standing boards
- generate dovetail joint geometry at the snapped connection

The interaction model should stay simple: two clicks in the 3D view.

## Goals / Non-Goals

**Goals:**
- Create a single upright board from the 3D span.
- Keep preview and commit on the same geometry path.
- Snap to existing upright boards in 3D.
- Generate dovetail connection geometry in shared core logic.

**Non-Goals:**
- Rework 2D nesting interaction.
- Add a full constraint system or persistent parametric joint graph.
- Change the preset-based board creation flow.

## Decisions

### 1. Add an explicit upright board mode in the board transform

`BoardTransform` gets an optional `orientation` so the same `Board` schema can describe:

- flat boards for existing presets and free panels
- upright boards for the 3D create tool

Why:
- The 2D cut geometry can stay in `outline` / `holes`.
- 3D rendering can decide how to orient the same board data.
- This is the smallest schema change that can actually represent a standing board.

### 2. Put upright board and dovetail geometry in `packages/core`

Shared core logic now owns:

- span normalization
- upright board outline generation
- upright board baseline extraction
- snap target detection
- dovetail tab / socket geometry

Why:
- This is render-agnostic geometry work.
- Editor and generator can share it.
- It keeps React components focused on interaction wiring instead of geometry generation.

### 3. Model the snapped connection as geometry, not runtime-only metadata

When create snaps to an existing upright board:

- the new board outline gains a dovetail tab
- the target board gains a dovetail socket hole

Why:
- 2D nesting and 3D rendering should show the same result.
- Exported document geometry should already contain the connection detail.
- This avoids introducing a second “joint graph” system just to render or export the same shape.

## Risks / Trade-offs

- [Moving boards after a joint is created will not preserve a semantic connection] → Accepted for now; the geometry remains valid, but the connection is baked into the shapes.
- [Upright board framing differs from flat board framing] → Mitigation: compute 3D workspace bounds from upright ground footprints plus upright height.
- [Holes were previously ignored by the 3D mesh path] → Mitigation: build `THREE.Shape` holes from board `holes` so dovetail sockets appear in 3D too.
