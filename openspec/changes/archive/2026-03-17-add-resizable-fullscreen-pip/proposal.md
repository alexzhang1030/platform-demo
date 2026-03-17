## Why

The editor's 2D PiP is currently caught between a tiny inset and an unclear maximize state. What we actually need is simpler: three explicit levels that let the PiP grow from a small reference window to a larger working view and then to a true fullscreen workspace, while stopping the hidden 3D canvas from burning GPU/CPU behind it.

## What Changes

- Replace the current PiP sizing behavior with three explicit levels: compact, expanded, and fullscreen.
- Remove edge-based resizing so the PiP uses bounded presets instead of freeform dimensions.
- Make the maximize control promote the PiP through those levels until it fully covers the main workspace region.
- Pause or skip the underlying R3F/WebGPU 3D preview render path while the PiP is fullscreen and visually occludes it.
- Keep existing PiP drag, zoom, and reset interactions compatible with the new level model.

## Capabilities

### New Capabilities
- `editor-pip-resize`: Support three-level and fullscreen-capable 2D PiP behavior in the editor, including render-cost reduction when the PiP fully replaces the 3D stage.

### Modified Capabilities

## Impact

- Affected code: `apps/web/src/components/pattern-studio/editor-page.tsx` and possibly a small local PiP helper extracted from it.
- Affected UX: the 2D PiP becomes a first-class staged surface with compact, expanded, and fullscreen levels, and fullscreen PiP mode temporarily suppresses the hidden 3D render workload.
- Dependencies: no new dependency is required; the change should build on existing React state and the current `BoardPreview3D` integration.
