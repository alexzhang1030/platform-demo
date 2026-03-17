## Context

The current pattern studio preview camera is a single hard-coded perspective camera placed at `[520, -520, 360]` with fixed `near` and `far` planes. That works only for a narrow slice of scene positions; once the user orbits slightly or the board layout shifts away from the implicit center, parts of the geometry can fall outside the camera frustum and appear clipped.

This fix is intentionally local to `board-preview-3d.tsx`. The goal is not to redesign controls or add new preview UI, but to make the existing preview camera robust against normal scene offsets and navigation.

## Goals / Non-Goals

**Goals:**
- Compute a stable camera framing from the current board workspace bounds instead of a single magic position.
- Derive clipping planes from scene size so board geometry remains visible during normal orbit movement.
- Preserve the current control scheme and WebGPU renderer path.

**Non-Goals:**
- Introduce orthographic mode, camera actions, or new interaction affordances.
- Change board dragging semantics or editor selection flow.
- Add new dependencies or a generalized camera state store.

## Decisions

### 1. Compute bounds-aware framing from the current document
The preview will derive a simple world-space bounding box or equivalent extents from the current boards and use that to determine camera target, camera distance, and a safe framing margin.

Why:
- The clipping problem is tied to hard-coded framing that assumes a fixed scene center.
- Bounds-aware placement scales with real content and keeps the fix local.

Alternative considered:
- Only move the camera farther away. Rejected because it reduces the chance of clipping but does not fix incorrect target/frustum assumptions.

### 2. Scale clipping planes with scene size instead of keeping them fixed
The preview camera `near` and `far` planes will be derived from the content bounds and camera distance with conservative padding.

Why:
- Fixed clipping values are brittle when scene size and camera distance vary.
- Scene-relative clipping is the direct fix for geometry disappearing after slight orbit changes.

Alternative considered:
- Set an extremely small `near` and extremely large `far` permanently. Rejected because it is blunt, can hurt depth precision, and ignores the actual workspace scale.

### 3. Keep the existing Perspective + OrbitControls stack
This change will not alter the current control library or interaction model.

Why:
- The reported bug is about visibility and clipping, not control behavior.
- A narrow fix lowers risk and keeps the change easy to verify.

Alternative considered:
- Fold this into a broader camera-controls refactor. Rejected because that expands the surface area of a targeted bug fix.

## Risks / Trade-offs

- [Bounds calculation may be too tight for rotated or thick boards] → Mitigation: include board thickness and add conservative framing/clipping padding.
- [Reframing on every document change could feel jumpy] → Mitigation: keep automatic reframing limited to initialization or clearly defined updates rather than every small interaction.
- [Very large `far` ranges can reduce depth precision] → Mitigation: compute `far` from scene size with bounded padding instead of using an unbounded constant.

## Migration Plan

1. Add board-bounds calculation utilities inside `board-preview-3d.tsx`.
2. Use those bounds to derive target, camera distance, and dynamic clipping planes.
3. Verify the preview no longer clips geometry under small orbit offsets and common board layouts.
4. Roll back by restoring the prior hard-coded camera if the framing logic causes regressions.

## Open Questions

- Whether reframing should only happen on first mount or also after major document changes such as adding or deleting boards.
