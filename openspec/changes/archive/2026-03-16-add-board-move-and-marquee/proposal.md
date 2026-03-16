## Why

The editor currently supports selection by direct click, but it does not support moving boards on the canvas or maintaining a shared multi-selection model across 2D and 3D. That leaves the editing workflow incomplete for basic layout work and forces users to rely on inspector fields for spatial changes.

## What Changes

- Add direct move interactions in the editor so users can drag selected boards in 2D and 3D instead of editing offsets only in the inspector.
- Add shared selection rules across 2D and 3D so clicking and dragging keep the same selected set and active board.
- Add viewport-safe interaction rules so move gestures do not conflict with pan, zoom, or point editing.

## Capabilities

### New Capabilities
- `board-editor-selection`: Covers multi-selection and direct board movement in the editor workspace.

### Modified Capabilities
- None.

## Impact

- Updates the `web` editor workspace and shared editor state in `apps/web`.
- May require small geometry helpers in `@xtool-demo/core` for hit testing, bounds checks, or multi-board movement.
- Changes the editor interaction model for both 2D and 3D views.
