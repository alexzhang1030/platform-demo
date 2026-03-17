## 1. Bounds-aware framing

- [x] 1.1 Add board workspace bounds calculation in `board-preview-3d.tsx`
- [x] 1.2 Replace the fixed preview camera target and position with bounds-aware framing derived from the current document

## 2. Clipping stability

- [x] 2.1 Derive perspective camera `near` and `far` values from scene size and camera distance instead of fixed constants
- [x] 2.2 Ensure the new framing and clipping logic includes safe padding for rotated boards and board thickness

## 3. Validation

- [ ] 3.1 Verify the 3D preview no longer clips geometry after small orbit offsets around the workspace
- [ ] 3.2 Verify boards that are offset away from the origin still open with a usable camera framing
- [x] 3.3 Run `bun run --cwd apps/web typecheck` and `bun run --cwd apps/web build`
