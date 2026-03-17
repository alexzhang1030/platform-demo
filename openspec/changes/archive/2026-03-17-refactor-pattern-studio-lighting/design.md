## Context

The current pattern studio preview defines lighting inline in `board-preview-3d.tsx` with one ambient light and two directional lights. That setup is enough to illuminate the scene, but it does not match the documented viewer lighting in `lib/editor/docs/lighting.md`: it is missing the third directional light, does not centralize the light configuration, and does not apply the documented theme transition model or shadow tuning. Since the preview already runs on `three/webgpu` with ACES tone mapping and shadows enabled, the missing piece is the scene light rig itself rather than a renderer migration.

This is a contained cross-cutting change inside the preview feature because the scene, theme state, materials, and shadows all depend on the lighting setup. The main constraint is to improve lighting quality without reintroducing unstable WebGPU-only helpers or broad post-processing work such as SSGI.

## Goals / Non-Goals

**Goals:**
- Match the preview light structure to the documented reference: three directional lights plus one ambient light.
- Move light configuration into a dedicated component or helper so the scene definition stays readable.
- Apply documented light colors, intensities, and shadow values for light and dark themes.
- Smoothly interpolate light properties during theme changes.
- Preserve the current WebGPU renderer, ACES exposure, board materials, selection outline, and interaction flow.

**Non-Goals:**
- Add SSGI, TRAA, bloom, environment maps, or any other new post-processing stage.
- Add item-level point lights or interactive lighting controls.
- Redesign board materials beyond any small adjustments required to keep the new lighting readable.
- Change scene composition, camera behavior, or grid behavior outside what is needed for the light rig.

## Decisions

### 1. Extract the preview lights into a dedicated component
The scene will stop declaring raw light JSX inline and instead render a dedicated component, likely adjacent to `board-preview-3d.tsx`, that owns light refs, theme targets, and interpolation.

Why:
- The reference implementation already treats lights as a dedicated unit.
- The current scene component is handling selection, drag, grid cursor, and object registration; keeping light logic inline makes it harder to tune safely.
- A dedicated component gives the change a clear boundary without adding a broad abstraction layer.

Alternative considered:
- Keep the lights inline and only tweak numbers. Rejected because the theme transition and shadow setup will keep growing, and the scene file is already doing too much.

### 2. Port the documented light layout, but scale only what the board preview needs
The preview will adopt the same structural layout and theme targets from `lib/editor/docs/lighting.md`: one shadowed key light, two support lights, and one ambient light, with cool dark-mode colors and lower ambient energy.

Why:
- This keeps the preview visually aligned with the documented editor viewer rather than inventing a second lighting vocabulary.
- The board preview has simple extruded geometry, so the documented layout should transfer cleanly.
- Using the same semantic roles makes future tuning easier.

Alternative considered:
- Copy the exact viewer implementation file-for-file. Rejected because the web preview has a smaller scene and does not need viewer-store coupling or unrelated editor dependencies.

### 3. Use frame-based interpolation for theme transitions
The light component will initialize directly to the current theme targets on first mount and then interpolate colors, intensities, and shadow intensity in `useFrame` on subsequent theme changes.

Why:
- This matches the documented behavior and avoids abrupt changes when switching themes.
- It keeps the implementation local to the R3F scene and avoids external animation state.
- The preview already renders every frame during interaction, so the additional lerp work is negligible.

Alternative considered:
- Recompute props declaratively from theme and let React replace them. Rejected because abrupt prop changes create harsh lighting jumps and make shadow contrast flicker more noticeably.

### 4. Keep the change compatible with existing WebGPU constraints
The light rig will remain limited to primitives already known to work with the preview's WebGPU path: ambient light, directional lights, and an orthographic shadow camera.

Why:
- Recent work already showed that some helper and post-processing combinations are fragile in this runtime path.
- The user asked specifically for lighting alignment, not a larger rendering overhaul.

Alternative considered:
- Extend the change to include SSGI because the reference doc mentions it. Rejected because that would materially expand scope and risk beyond a lighting refactor.

## Risks / Trade-offs

- [The documented light intensities may overexpose or flatten the smaller board preview] → Mitigation: preserve ACES exposure, start from the documented values, and tune only the minimum necessary for the preview's tighter framing.
- [Smooth theme interpolation may leave lights in an in-between state for a few frames during toggles] → Mitigation: initialize directly on first mount and clamp delta during interpolation, matching the documented pattern.
- [Higher shadow contrast may reveal acne or detached shadows on thin extruded boards] → Mitigation: port the documented shadow bias, normal bias, and shadow camera bounds together rather than adjusting only intensity.
- [A dedicated light component adds another file to a relatively small feature] → Mitigation: keep the API narrow and colocated with the preview, with no shared abstraction until a second caller exists.

## Migration Plan

1. Introduce a dedicated pattern-studio lighting component with refs for the three directional lights and ambient light.
2. Port the documented theme targets and shadow configuration into that component.
3. Replace the inline scene lights with the new component and verify board materials and outlines remain readable.
4. Run typecheck and production build, then manually compare light and dark theme preview behavior.

Rollback is straightforward: revert the light component extraction and restore the previous inline ambient and directional lights.

## Open Questions

- Whether the board preview should exactly match the documented viewer intensities or intentionally use a slightly reduced key-light intensity because the camera is much closer.
- Whether shadow intensity should remain theme-dependent if board colors are further tuned later.
