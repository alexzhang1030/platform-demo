## Why

The pattern studio 3D preview currently uses a fixed camera setup that can clip the active boards after only a small camera offset. We need the preview camera to frame the workspace robustly so users can orbit and inspect boards without geometry disappearing unexpectedly.

## What Changes

- Replace the current hard-coded preview framing with bounds-aware camera placement based on the board workspace.
- Adjust camera clipping planes so the visible board geometry remains inside the camera frustum during normal navigation.
- Keep the fix local to the pattern studio 3D preview and preserve the existing WebGPU rendering path and current control scheme.

## Capabilities

### New Capabilities
- `pattern-studio-camera-framing`: Defines stable bounds-aware framing and clipping behavior for the pattern studio 3D preview camera.

### Modified Capabilities

## Impact

- Affected code: `apps/web/src/components/pattern-studio/board-preview-3d.tsx`.
- Affected UX: initial 3D framing, orbiting reliability, and visible geometry stability while navigating around boards.
- Dependencies: no new dependencies are expected; this should build on current three.js scene bounds and camera configuration.
