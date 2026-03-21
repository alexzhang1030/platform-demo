## 1. Core Logic

- [x] 1.1 Implement `findParallelWallPair` helper in `apps/web/src/lib/pattern-studio.ts`.
- [x] 1.2 Implement `addGableRoofToGroup` function in `apps/web/src/lib/pattern-studio.ts`.
- [x] 1.3 Add trigonometry logic to calculate roof panel length based on span and pitch (45°).

## 2. UI Integration

- [x] 2.1 Add "Add Gable Roof" button to `GroupEditorContent` in `apps/web/src/components/pattern-studio/editor-page.tsx`.
- [x] 2.2 Connect the button to the `addGableRoofToGroup` logic.
- [x] 2.3 Verify that the new roof boards are automatically selected or added to the group correctly.

## 3. Verification

- [x] 3.1 Use Smart Pen to draw a box.
- [x] 3.2 Select the group and click "Add Gable Roof".
- [x] 3.3 Verify the roof panels meet at the peak and are correctly anchored at the wall tops.
