## 1. Dialog editing foundation

- [x] 1.1 Extract the existing single-board inspector form in `apps/web/src/components/pattern-studio/editor-page.tsx` into reusable board editor content
- [x] 1.2 Add editor-page state and callbacks for opening and closing a board edit dialog from the active board id
- [x] 1.3 Render the reusable board editor content inside a dialog without breaking the existing overlay inspector workflow

## 2. Workspace interaction wiring

- [x] 2.1 Add 2D board double-click handling that selects the target board and opens the board edit dialog
- [x] 2.2 Add 3D board double-click handling that selects the target board and opens the board edit dialog
- [x] 2.3 Ensure double-click edit-open is suppressed during create-board, drag, and camera/navigation interactions

## 3. Verification

- [x] 3.1 Verify dialog edits update the current document and stay reflected in both 2D and 3D views
- [x] 3.2 Run `bun run --cwd apps/web typecheck`
- [x] 3.3 Run `bun run --cwd apps/web build`
