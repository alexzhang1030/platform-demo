## Context

The current editor supports board creation, direct point editing in 2D, and board selection by click in both 2D and 3D. It does not support moving boards by dragging them inside the workspace, and it does not support a shared multi-selection workflow that survives across both views.

This change touches both 2D and 3D interaction layers, so the design needs a single selection model that works across both views without breaking existing pan, zoom, and control-point editing behavior.

## Goals / Non-Goals

**Goals:**
- Add direct board movement in the workspace instead of relying only on numeric inspector inputs.
- Keep one shared selection state across 2D and 3D, including a clear active board.
- Prevent gesture conflicts between move, point editing, pan, and zoom.

**Non-Goals:**
- Arbitrary rotation handles, resize handles, or transform gizmos.
- Freeform lasso selection.
- Hole-level selection or control-point multi-selection.
- Group creation, locking, or persistent named selections.

## Decisions

### Use shared editor selection state with an ordered selected ID list
The editor will track:
- `selectedBoardIds` as an ordered array;
- `activeBoardId` as the last focused board;
- transient interaction state for move gestures.

This is preferred over a single selected ID plus ad hoc multi-select flags because move interactions need a stable set that both 2D and 3D can read.

### Move selected boards as a batch from either 2D or 3D
Dragging a selected board in 2D or 3D will move the entire selected set by the same delta. Dragging an unselected board first collapses selection to that board, then starts the move.

This is preferred over moving only the board under the cursor because batch movement is the main reason multi-selection exists.

### Prioritize editing gestures before navigation gestures
Interaction priority will be:
1. control-point drag
2. board move drag
3. viewport pan/orbit

This keeps direct editing intentional and avoids cases where users try to move a board but pan the viewport instead.

### Keep implementation local to the web editor
Selection and gesture state will stay in `apps/web` and use the existing document update path. Shared packages may receive small helpers for bounds or hit testing, but the interaction controller remains local to the editor.

This is preferred over moving selection state into protocol or core because it is view-specific behavior, not document data.

## Risks / Trade-offs

- [Multi-select increases editor state complexity] → Keep state flat and explicit, with clear gesture precedence and helper functions for set updates.
- [3D move drags can feel less precise than 2D] → Define movement on a stable work plane and keep 2D as the authoritative precision workflow.
- [Batch move can produce large accidental changes] → Preserve immediate visual feedback and keep inspector values synchronized so the result is visible and reversible by direct re-entry.
