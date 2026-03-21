## Why

Currently, boards are limited to 'flat' (horizontal) or 'upright' (vertical) orientations. Creating complex 3D structures like pitched roofs, angled braces, or non-orthogonal assemblies is impossible. This change introduces the ability to tilt boards at any angle, starting with a "Hinge Extrude" tool.

## What Changes

- **Schema Update**: Add `pitch` property to `BoardTransform` to support arbitrary tilt angles.
- **3D Rendering**: Update `BoardPreview3D` to respect the `pitch` property when rendering board meshes.
- **Hinge Extrude Tool**: Add a new action in the Board Inspector to create a new board anchored to the top edge of the selected board, with a controllable pitch.
- **Inspector UI**: Add a "Pitch" slider to the Board Editor when a board is in 'hinged' mode.

## Capabilities

### New Capabilities
- `board-hinge-pitch`: Allows boards to be tilted at arbitrary angles (pitch) relative to their anchor point, enabling non-orthogonal construction like roofs.

### Modified Capabilities
- `pattern-studio-create-board`: Extend the board definition to support the new `hinged` orientation and `pitch` parameter.

## Impact

- `packages/protocol/src/index.ts`: Updated `BoardTransform` interface and Zod schema.
- `apps/web/src/components/pattern-studio/board-preview-3d.tsx`: Updated Three.js rotation logic.
- `apps/web/src/components/pattern-studio/editor-page.tsx`: New UI controls for pitch and the "Hinge Extrude" action.
