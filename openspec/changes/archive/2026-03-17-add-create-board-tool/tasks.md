## 1. 3D create state and snapping

- [x] 1.1 Move create-board tool state into `board-preview-3d.tsx` with idle, drawing, and cancel handling
- [x] 1.2 Add 3D ground-plane snapping and default 45-degree direction snapping helpers, with Shift temporarily disabling angle snapping

## 2. 3D preview and commit

- [x] 2.1 Render a live cursor marker and in-progress board preview in the 3D workspace while drawing
- [x] 2.2 Commit a new rectangular `Board` from the snapped 3D span on the second click and make it the active selection
- [x] 2.3 Ignore degenerate create attempts where the drawn span is effectively zero

## 3. Editor integration

- [x] 3.1 Keep a visible create-board tool affordance in the editor UI without removing preset-based creation
- [x] 3.2 Remove the temporary 2D create implementation and ensure normal 3D selection, dragging, and camera interactions do not conflict with the active create-board tool

## 4. Validation

- [x] 4.1 Verify snapped 3D create, Shift override, preview, commit, and cancel behaviors in the editor
- [x] 4.2 Verify create mode over existing boards still creates instead of starting drag
- [x] 4.3 Run `bun run --cwd apps/web typecheck` and `bun run --cwd apps/web build`
