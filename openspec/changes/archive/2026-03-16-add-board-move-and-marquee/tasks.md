## 1. Selection state

- [x] 1.1 Extend the editor state to track `selectedBoardIds`, `activeBoardId`, and transient move interaction state
- [x] 1.2 Add selection helper functions for single select, modifier select, collapse-to-one, and batch move updates

## 2. 2D interactions

- [x] 2.1 Implement direct dragging for selected boards in 2D and ensure it does not conflict with point editing or viewport pan
- [x] 2.2 Synchronize the inspector and selection visuals with the new multi-selection behavior in 2D

## 3. 3D interactions

- [x] 3.1 Update 3D click selection to read and write the shared selection state, including collapse-to-one behavior before drag
- [x] 3.2 Implement drag-to-move for the selected board set on the shared layout plane in the 3D workspace
- [x] 3.3 Ensure 3D move gestures block orbit or pan until the drag completes and keep 2D state synchronized

## 4. Validation

- [x] 4.1 Add or update tests for selection helpers and batch movement behavior
- [x] 4.2 Manually verify click select, modifier select, 2D move, 3D move, and gesture conflict handling in the editor
