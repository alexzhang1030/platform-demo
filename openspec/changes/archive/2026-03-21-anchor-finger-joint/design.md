## Context

Board outlines are stored in local board space as `Path2DShape` (a sequence of points). For upright boards the outline spans `(0,0)` → `(length, height)` in X×Y. The `Board.outline` is what the renderer and nesting pipeline both consume. Board connections (`BoardConnection`) record which anchor of one board touches which anchor of another — they are pure metadata with no associated geometry today.

The previous dovetail system baked modified geometry directly into `Board.outline` on connection, which broke ungrouping (the original outline was lost). The new design keeps `Board.outline` as the canonical, unmodified source of truth and derives all joint geometry on-the-fly.

## Goals / Non-Goals

**Goals:**
- Compute finger joint tab/slot patterns at connection edges without mutating stored board outlines
- Handle two connection geometries: L-joint (~90° between boards) and straight/inline joint (~0°/180°)
- Integrate into 3D preview (board mesh) and eventually nesting output
- Keep `Board.outline` clean; ungroup cleanly restores unmodified boards

**Non-Goals:**
- T-joints (anchor `top`/`bottom` connecting to another board's edge) — deferred to a later change
- Non-upright (flat) board joints — out of scope for this change
- Variable finger width per-connection — use a computed default for now

## Decisions

### Decision: Joint geometry is computed on-the-fly, never stored

`getBoardOutlineWithJoints(board, groups, allBoards)` computes the finger-modified outline every time it is called. The result is ephemeral — used for render/export but never written back to `PatternDocument`.

Alternative: bake modified outline into `Board.outline` on connect. Rejected — ungrouping must restore the original shape; this was the flaw in the prior dovetail approach.

### Decision: Angle between boards determines joint type

Given `BoardConnection { a: { boardId, anchor }, b: { boardId, anchor } }`:
1. Retrieve `baseline.direction` for each board
2. Flip the direction of board B if its connecting anchor is `'right'` (end, not start), so both vectors point *away* from the joint
3. Compute the cross product (sin θ) and dot product (cos θ) between the two outward directions
4. `|sin θ| > 0.5` → L-joint (angle 30°–150°, treat as 90°)
5. `cos θ > 0` → straight joint (both boards pointing the same general direction)
6. `cos θ < 0` → inline joint (boards pointing toward each other, end-to-end)

L-joint and inline joint share the same finger tab/slot geometry but differ in which edge is modified and the orientation of the tabs relative to the face.

### Decision: Finger count derived from board height

`fingerCount = max(3, round(height / (2 * thickness)))` — odd finger count ensures both ends start/end with a tab (not a slot), which is structurally stronger. `fingerWidth = height / fingerCount`. Minimum 3 fingers.

### Decision: L-joint geometry

Board A (connecting at its `left` or `right` end) and Board B (similarly):
- Both boards get alternating tabs/slots cut along their connecting end edge (at X=0 or X=length in local space)
- Tab depth = `otherBoard.thickness`
- Board A has tabs at odd finger slots [0, fingerWidth], [2·fw, 3·fw], ... (protruding outward)
- Board B has tabs at even finger slots [fingerWidth, 2·fw], ... (complementary fit)
- The "which board gets odd/even" assignment is determined by the anchor comparison (`a` board always gets odd tabs)

### Decision: Straight/inline joint geometry

When two boards are colinear (end-to-end), a standard edge finger joint is not meaningful. Instead:
- Compute a lap-style interlocking cut on the face: one board's end has horizontal teeth (along Y at X=length), the other has matching slots
- Same tab/slot math as L-joint but the depth is capped at `min(thickness, length * 0.25)` to avoid removing too much material

### Decision: `getBoardOutlineWithJoints` lives in `packages/core`

The algorithm is render-agnostic. The UI layer (`board-preview-3d.tsx`) calls it at render time.

## Risks / Trade-offs

- [Risk] Finger count formula may produce bad results for very short or very tall boards → Mitigation: clamp fingerCount to [3, 15] range and fingerWidth to [thickness * 0.8, thickness * 3]
- [Risk] Boards at ambiguous angles (45°) could be misclassified → Mitigation: only L-joint and straight joint are supported; other angles fall back to no joint modification with a console warning
- [Risk] Rendering the modified outline requires re-computing on every frame if the document changes → Mitigation: the computation is cheap (O(fingerCount) point generation); no memoisation needed initially

## Open Questions

- Should the 2D nesting output also use `getBoardOutlineWithJoints`? The proposal says yes, but the nesting pipeline (`packages/core/src/nesting.ts`) currently consumes raw `Board.outline`. Wiring this in is straightforward but needs a follow-up check that nesting tests still pass.
