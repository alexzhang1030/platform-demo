## Why

The pattern studio 3D preview currently uses a minimal ambient-plus-two-directional setup that does not match the lighting model documented in `lib/editor/docs/lighting.md`. We need to align the preview lighting now so board shape, thickness, shadow contrast, and theme mood read consistently after the WebGPU migration.

## What Changes

- Refactor the pattern studio 3D preview to use a dedicated lighting component with three directional lights and one ambient light.
- Align the main light shadow setup with the documented WebGPU viewer baseline, including shadow map size, bias, normal bias, radius, and orthographic shadow bounds.
- Add theme-aware light colors and intensities that transition smoothly between light and dark mode instead of switching abruptly.
- Keep the existing ACES tone mapping and exposure pipeline while making the new light rig the source of scene contrast.
- Exclude SSGI, item point lights, and broader post-processing work from this change.

## Capabilities

### New Capabilities
- `pattern-studio-lighting`: Support a documented, theme-aware WebGPU lighting rig for the pattern studio 3D preview with stable shadows and smooth theme transitions.

### Modified Capabilities

## Impact

- Affected code: `apps/web/src/components/pattern-studio/board-preview-3d.tsx` and a new or extracted lighting-focused component in the same feature area.
- Affected UX: the 3D preview will show stronger shape definition, more intentional dark-mode mood, and more stable shadow behavior while keeping existing camera, selection, and drag workflows unchanged.
- Dependencies: no new dependency is required; the change builds on existing `three/webgpu`, `@react-three/fiber`, and the app theme provider.
