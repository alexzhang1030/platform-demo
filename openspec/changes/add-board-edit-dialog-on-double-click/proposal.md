## Why

The current editor requires board edits to happen through always-on side panels or indirect selection flows, which slows down focused edits after picking a board in the workspace. A direct double-click action in either the 2D or 3D board surface would make per-board editing faster and align the editing entry point with the object the user is interacting with.

## What Changes

- Add a board-focused edit dialog that opens when the user double-clicks a board in either the 2D or 3D workspace.
- Route the double-click target board into the editor's active board state before opening the dialog.
- Reuse the existing board editing controls inside the dialog so a single board can be edited without relying on the surrounding layout.
- Define interaction precedence so double-click edit does not conflict with single-click selection, drag, or camera/navigation gestures.
- Keep dialog editing synchronized with the main document so edits made in the dialog update the normal editor views immediately.

## Capabilities

### New Capabilities
- `pattern-studio-board-edit-dialog`: open a focused dialog for editing an individual board from direct workspace interaction

### Modified Capabilities
- `pattern-studio-layout`: allow board editing controls to be presented in a dialog in addition to existing overlay panels

## Impact

- Affected code:
  - board hit-testing and pointer gesture handling in the 2D and 3D editor surfaces
  - board selection and active-board state wiring in the pattern studio editor
  - board inspector/editor UI composition and dialog presentation
- Affected behavior:
  - double-click gestures on boards in both workspace modes
  - single-board editing flow and inspector presentation
  - interaction conflict handling between selection, dragging, navigation, and edit-open gestures
