## Why

The current 3D create flow is centered on drawing individual boards, but the board-composition workflow is not complete enough for fast block-based modeling. We need a second creation path that lets users build volume by stacking uniform cells, while treating the result as a first-class grouped object instead of a loose collection of boards.

## What Changes

- Add a new `boxel-mode` tool in the pattern studio editor alongside the existing create-board flow.
- Introduce a first-class `BoxelAssembly` document entity that stores a uniform cell size, origin, and occupied grid cells.
- Allow the user to click the ground plane to create a new assembly with one boxel at floor level.
- Allow repeated clicks on the same column to stack additional boxels upward into the same assembly.
- Treat a committed assembly as one selectable object in the editor instead of per-boxel selection.
- Render boxel assemblies as stacked cubes in the 3D workspace using derived geometry from the assembly data.
- Keep the first version intentionally narrow: uniform cell size only, vertical stacking only, and no conversion to cut-board output yet.

## Capabilities

### New Capabilities
- `pattern-document-boxel-assemblies`: Defines the `PatternDocument` support for first-class boxel assemblies made of uniform grid cells.
- `pattern-studio-boxel-mode`: Defines the editor tool, interaction flow, preview behavior, stacking rules, and selection model for boxel-based creation.

### Modified Capabilities

## Impact

- Affected code: `packages/protocol/src/index.ts`, new or expanded helpers in `packages/core`, and pattern studio editor/view code under `apps/web/src/components/pattern-studio` and `apps/web/src/lib/pattern-studio.ts`.
- Affected UX: editor tool selection, 3D creation flow, selection behavior, and workspace rendering.
- Affected data model: `PatternDocument` gains a new persisted entity type for boxel assemblies.
- Dependencies: no new external dependencies expected; the change should build on the existing React, WebGPU/Three-style viewport, and shared core/protocol packages.
