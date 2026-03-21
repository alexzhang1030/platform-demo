## Context

The current editor persists only `Board` entities in `PatternDocument`, and the 3D create flow is designed around a two-click upright-board gesture. That works for single-part placement, but it does not provide a reliable composition model for building up grouped volume. The requested `boxel-mode` is explicitly a different creation mode: the user enters add mode, clicks a spot on the ground plane, gets a cube above the floor, and keeps clicking to stack more cubes upward. The resulting stack must be treated as one overall object.

This is a cross-cutting change because it touches the persisted document schema, shared geometry helpers, editor interaction state, and 3D rendering. The first version is intentionally constrained to uniform cell size and vertical stacking within one `(x, y)` column so the data model can be introduced cleanly without prematurely solving full voxel editing.

## Goals / Non-Goals

**Goals:**
- Add a first-class `BoxelAssembly` entity to the document model instead of encoding boxels as grouped boards.
- Add a `boxel-mode` editor tool that creates a new assembly on the first ground-plane click.
- Support repeated clicks on the same column to stack more cells upward into the active assembly.
- Render persisted and in-progress boxel assemblies as uniform cubes in the 3D workspace.
- Make selection and active-object behavior operate at the assembly level for boxel content.
- Keep the implementation aligned with the current package split: protocol for schema, core for shared calculations, app layer for tool state and rendering.

**Non-Goals:**
- Support arbitrary horizontal voxel painting, brush dragging, or flood-fill style authoring.
- Merge multiple assemblies together automatically.
- Convert boxel assemblies into final board-cutting output in this change.
- Generalize the entire editor into a full multi-mode tool framework if a localized mode extension is sufficient.

## Decisions

### 1. Persist boxels as `BoxelAssembly`, not as derived boards
`PatternDocument` will gain a new `assemblies` collection that stores `BoxelAssembly` objects. Each assembly will own its `id`, `name`, `cellSize`, `origin`, and a list of integer `cells` with `{x, y, z}` coordinates.

Why:
- The user explicitly wants stacked boxels to be treated as one whole, which is a data-model concern, not only a selection concern.
- Persisting cells instead of generated boards keeps the source of truth simple and avoids synchronization bugs between a group and its members.
- It creates a clean base for future operations like merge, carve, export, or boxel-to-board conversion.

Alternative considered:
- Store individual `Board` objects plus a grouping wrapper. Rejected because the group would not be the geometric source of truth and later edits would become brittle.

### 2. Use one global default cell size per assembly in v1
Each new assembly will use a single uniform cell size constant in the first version. Every committed cell in that assembly uses the same dimensions.

Why:
- This matches the agreed product scope and keeps both interaction and rendering predictable.
- A fixed unit simplifies snapping, stacking, occupancy checks, and visual alignment with the floor grid.

Alternative considered:
- Allow per-assembly or per-cell variable dimensions immediately. Rejected because it expands both schema and interaction complexity without first validating the basic workflow.

### 3. Restrict v1 authoring to vertical stacking in one column
The first click creates a new assembly with a single occupied cell at `z = 0`. Subsequent clicks in `boxel-mode` on that same assembly column add a new cell at the next available `z` level above the current top cell.

Why:
- It satisfies the requested workflow while minimizing ambiguity around “which assembly should this click extend?”
- It keeps the first selection and placement rules straightforward.
- It avoids prematurely designing lateral growth rules, merge rules, or neighbor heuristics.

Alternative considered:
- Allow horizontal adjacency placement from day one. Rejected because it requires additional decisions around target assembly resolution, merge behavior, and cursor feedback.

### 4. Derive render geometry from assemblies at the view layer using shared core helpers
`packages/core` will expose pure helpers for converting assembly cells into world-space boxes, bounds, and placement lookups. The editor viewport will consume those helpers to render one cube per cell and compute preview/selection overlays.

Why:
- Core logic for occupancy and coordinate conversion is shared, render-agnostic logic and belongs in `packages/core`.
- The 3D view should stay responsible only for presentation and interaction wiring.

Alternative considered:
- Compute all boxel placement inline inside the React components. Rejected because it duplicates logic and makes later generator/editor reuse harder.

### 5. Keep board selection and boxel selection as parallel top-level concepts
Editor selection state will be extended to track an active assembly id and selected assembly ids alongside existing board selection. `boxel-mode` interactions will target assemblies; existing board tools continue to target boards.

Why:
- Assemblies are first-class persisted objects and need first-class selection state.
- Reusing board ids for assemblies would create type confusion and conditional behavior throughout the editor.

Alternative considered:
- Replace the whole selection model with one generalized entity union now. Rejected because it broadens the refactor beyond what this change needs.

### 6. Generator compatibility stays non-blocking in v1
This change will keep boxel assemblies visible and editable in the editor, but it will not define final manufacturing output for them yet. Generator-facing code should either ignore assemblies safely or surface that they are not yet part of the board output.

Why:
- The immediate goal is to unlock voxel-based authoring, not to prematurely choose a fabrication strategy.
- Forcing boxel-to-board conversion in the same change would couple two unresolved product decisions.

Alternative considered:
- Auto-expand every cell into a board immediately. Rejected because that would erase the value of introducing assemblies as a distinct modeling concept.

## Risks / Trade-offs

- [The document schema now carries two top-level geometric entity types] → Mitigation: keep responsibilities explicit, with boards for manufactured sheet parts and assemblies for voxel authoring.
- [Parallel board and assembly selection state can add UI branching] → Mitigation: isolate selection helpers and keep assembly interactions limited to `boxel-mode` for the first pass.
- [Generator output may appear incomplete when documents contain assemblies] → Mitigation: document this limitation in the spec and ensure generator code handles assemblies explicitly rather than failing implicitly.
- [Future horizontal expansion may require revisiting the assembly interaction model] → Mitigation: design the persisted cell list generically now, even though v1 authoring only adds vertical cells.

## Migration Plan

1. Extend `packages/protocol` with `BoxelAssembly` and document parsing/serialization support.
2. Add shared `packages/core` helpers for assembly occupancy, world-space placement, and bounds.
3. Extend editor selection/tool state to recognize assemblies and the new `boxel-mode`.
4. Render committed and preview boxels in the 3D viewport and wire clicks to create/extend assemblies.
5. Ensure generator and other document consumers handle the new `assemblies` field safely.

## Open Questions

- Whether the first created assembly should remain the active stacking target until the user selects another tool or another assembly.
- Whether floor-level placement should be represented as `z = 0` with the cube resting on the ground plane or as an origin offset plus positive z cells; this is an implementation detail but should be applied consistently.
