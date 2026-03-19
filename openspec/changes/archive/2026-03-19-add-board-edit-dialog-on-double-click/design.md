## Context

The current pattern studio editor already has the core pieces for board editing, but they are split across different surfaces. The 2D nesting surface can hit-test board shapes, the 3D workspace can hit-test and drag board meshes, and the inspector panel contains the actual form controls for editing the active board. What is missing is a focused object-first entry point that lets the user open editing directly from the board they are interacting with.

This change needs to touch both rendering surfaces and the editor shell. The 2D surface needs a double-click gesture on a board placement, the 3D surface needs a double-click gesture on a board mesh, and the editor page needs a dialog presentation mode that can host the existing board inspector content without forking the editing logic.

## Goals / Non-Goals

**Goals:**
- Let users open a board edit dialog by double-clicking a board in either the 2D or 3D workspace.
- Reuse the existing single-board inspector fields instead of creating a second independent editor implementation.
- Keep board selection and active-board state synchronized with dialog open state.
- Preserve existing single-click selection, drag, create-board, and camera/navigation behaviors.

**Non-Goals:**
- Redesign the board editing fields or add new editable board properties in this change.
- Introduce multi-board editing inside the dialog.
- Replace the existing overlay inspector panel for all workflows.
- Change the document schema or move editing logic into `packages/core`.

## Decisions

### 1. Use the active board as the dialog source of truth
Double-clicking a board in either surface will first update selection so the clicked board becomes the active board, then open a dialog keyed off that active board id.

Why:
- The editor already treats the active board as the source for inspector editing.
- This avoids duplicating "current board" state just for the dialog.
- It keeps external surfaces and the dialog synchronized automatically.

Alternative considered:
- Store a separate dialog-specific board id. Rejected because it duplicates selection state and creates avoidable sync bugs when the document or selection changes elsewhere.

### 2. Extract the existing inspector form into a reusable board editor section
The current inspector form content in `editor-page.tsx` should be moved into a reusable component or render block that can be mounted both inside the overlay inspector and inside the dialog.

Why:
- The editing fields already exist and should remain behaviorally identical.
- Reuse keeps validation, update wiring, and future field changes in one place.
- It lowers the implementation risk compared with rebuilding the form in a separate modal.

Alternative considered:
- Build a dialog-only editor UI. Rejected because it would fork the editing experience and create maintenance drift.

### 3. Resolve double-click as an additive edit-open gesture, not a replacement for selection
A board double-click will still include the first click's normal selection behavior, but the second click will open the dialog only when the pointer sequence resolves on the same board without entering drag/create/navigation handling.

Why:
- Users still expect the board to become selected immediately on first click.
- It keeps gesture behavior aligned with desktop selection/edit conventions.
- It prevents accidental dialog opens during drag or camera operations.

Alternative considered:
- Open the dialog on single click. Rejected because it would break fast selection and conflict with drag workflows.

### 4. Keep 2D and 3D gesture wiring local, but route both through one open-edit callback
The 2D SVG board placements and the 3D board meshes should each detect double-click in the most local way for their surface, then call a shared editor-page callback such as `onBoardEditRequest(boardId)`.

Why:
- The hit-testing primitives differ significantly between the two surfaces.
- A shared editor-level callback keeps dialog state and selection logic centralized.
- It reduces cross-component coupling while still producing consistent behavior.

Alternative considered:
- Build a generic gesture abstraction shared by 2D and 3D. Rejected because the implementation cost is not justified for one shared gesture.

## Risks / Trade-offs

- [Double-click may conflict with drag initiation in 3D] → Mitigation: only open the dialog when no drag state was committed during the pointer sequence.
- [The same inspector mounted twice can create duplicated update paths] → Mitigation: extract the form into one reusable content block and keep all board updates flowing through the same `updateBoard` callback.
- [Users may lose context if the dialog replaces the panel mentally] → Mitigation: keep the existing inspector available and position the dialog as a focused edit shortcut, not the only editing path.
- [2D is now a derived nesting view rather than a full editor surface] → Mitigation: scope the 2D gesture to board-targeted selection and dialog open only, without reintroducing direct geometry editing there.
