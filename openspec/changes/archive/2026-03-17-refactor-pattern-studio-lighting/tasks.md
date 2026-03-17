## 1. Light rig extraction

- [x] 1.1 Add a dedicated pattern-studio lighting component or helper for the 3D preview scene
- [x] 1.2 Replace the inline ambient and directional lights in `board-preview-3d.tsx` with the dedicated light rig

## 2. Theme-aware lighting behavior

- [x] 2.1 Configure the light rig with three directional lights and one ambient light using the documented positions, colors, and intensity targets
- [x] 2.2 Add first-mount initialization and frame-based interpolation so light and dark theme transitions are smooth
- [x] 2.3 Configure the main directional light shadow camera, map size, bias, normal bias, radius, and theme-aware shadow intensity

## 3. Validation

- [x] 3.1 Verify the preview still preserves board selection, dragging, outline rendering, and camera controls with the new light rig
- [x] 3.2 Run `bun run --cwd apps/web typecheck` and `bun run --cwd apps/web build`
- [ ] 3.3 Manually compare the 3D preview in light and dark themes to confirm cooler dark-mode lighting and improved board shape readability
