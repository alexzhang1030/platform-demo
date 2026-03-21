## 1. Schema & Logic Updates

- [x] 1.1 Update `BoardTransform` interface in `packages/protocol/src/index.ts` to include `pitch?: number` and `'hinged'` orientation.
- [x] 1.2 Update `boardTransformSchema` in `packages/protocol/src/index.ts` to include `pitch` and `'hinged'`.
- [x] 1.3 Create `hingeExtrudeBoard` helper in `apps/web/src/lib/pattern-studio.ts` to calculate new board position and properties.

## 2. 3D Rendering

- [x] 2.1 Update `BoardMesh` component in `apps/web/src/components/pattern-studio/board-preview-3d.tsx` to handle `hinged` orientation.
- [x] 2.2 Apply `pitch` rotation in `BoardMesh` using `MathUtils.degToRad(pitch)`.
- [x] 2.3 Verify correct rotation axis (X vs Y) based on anchor world position.

## 3. UI Implementation

- [x] 3.1 Add "Hinge Extrude" button to `BoardEditorContent` in `apps/web/src/components/pattern-studio/editor-page.tsx`.
- [x] 3.2 Implement "Pitch" slider in `BoardEditorContent` that appears when a board is hinged or upright.
- [x] 3.3 Connect the \"Pitch\" slider to the `onBoardChange` callback to update the document state.
- [x] 3.4 Verify the "Hinge Extrude" action creates a new board and selects it automatically.
