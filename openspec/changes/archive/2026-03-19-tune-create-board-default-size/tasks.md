## 1. Upright board model and shared geometry

- [x] 1.1 Extend the board transform so a board can be rendered as `upright`
- [x] 1.2 Move upright-board span normalization, baseline extraction, snap detection, and dovetail geometry generation into `packages/core`

## 2. 3D create-board workflow

- [x] 2.1 Replace the temporary interlocking pair create logic with a single upright board preview and commit path
- [x] 2.2 Snap create points against existing upright boards in the 3D scene
- [x] 2.3 Apply dovetail tab geometry to the new board and dovetail socket geometry to the target board when a snap occurs

## 3. Rendering and validation

- [x] 3.1 Update the 3D mesh path so upright boards render upright and board holes are cut into the mesh
- [x] 3.2 Update camera/workspace bounds code so upright boards frame correctly in 3D
- [x] 3.3 Run `bun run --cwd packages/core typecheck`
- [x] 3.4 Run `bun run --cwd apps/web lint`
- [x] 3.5 Run `bun run --cwd apps/web typecheck`
- [x] 3.6 Run `bun run --cwd apps/web build`
