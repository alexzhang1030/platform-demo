## Context

The current pattern studio still treats the 2D surface as an editable canvas alongside the 3D workspace. That no longer fits the product split: 3D is becoming the primary authoring environment, while 2D should serve as a production-facing nesting view for laser cutting. The reference layout already supports a dominant workspace with overlays and PiP, so this change is mainly about redefining what the 2D panel does and how its data is produced.

The new 2D surface needs deterministic auto-arrangement rather than manual manipulation. That means the 2D rendering path should consume a derived layout result produced from the current set of boards, not the live interactive editor transform model.

## Goals / Non-Goals

**Goals:**
- Remove direct 2D editing affordances such as board drag, point drag, and 2D create-board.
- Treat the 2D area as a laser-cutter-oriented nesting/output surface.
- Produce 2D board placement through a packing algorithm instead of manual free placement.
- Keep 3D as the primary editing surface for create, select, drag, and inspect workflows.
- Preserve the current shell, split view, and PiP model while changing the role of the 2D panel.

**Non-Goals:**
- Implement full manufacturing optimization such as grain direction, kerf compensation, or true irregular nesting in the first pass.
- Change the board document schema itself.
- Rebuild the generator route or export format in this change.
- Add a large third-party CAD dependency just to render the 2D layout.

## Decisions

### 1. Replace the 2D editor surface with a derived nesting view
The 2D panel will no longer own editing interactions. It will render a derived arrangement result based on the current document boards and a packing result.

Why:
- This cleanly separates authoring from manufacturing preview.
- It removes duplicated editing logic across 2D and 3D.
- It matches the stated product direction that 2D is for the laser cutter view.

Alternative considered:
- Keep a hybrid 2D mode with both editing and nesting. Rejected because it preserves the ambiguity that caused the current mismatch.

### 2. Use a rectangular packing strategy first
The initial implementation will treat boards as packable rectangles derived from their bounds and rotation options, using a matrix/bin-packing style algorithm to arrange them onto a sheet or sheets.

Why:
- Current boards are primarily panel-like shapes, and a rectangle-first nesting pass is much simpler to ship and reason about.
- It is sufficient to present a production-oriented arrangement without needing full polygon nesting.
- It keeps the implementation local and testable.

Alternative considered:
- Implement full polygon nesting immediately. Rejected because it is materially more complex and unnecessary for the first refactor.

### 3. Keep packing logic in the shared core package
The arrangement algorithm and its data preparation will live in `packages/core` instead of inside React components or `apps/web`-local helpers.

Why:
- Packing is pure computation and should be testable outside the UI.
- The derived result may later be reused by export or generator flows.
- It keeps `editor-page.tsx` focused on presentation and wiring.
- It matches the project rule that render-agnostic, shareable algorithms belong in the shared core layer.

Alternative considered:
- Keep the first implementation in `apps/web/src/lib/`. Rejected because the packing logic is render-agnostic and should be shareable across editor and generator.

### 4. Let the 2D panel render derived sheets, not document transforms
The 2D renderer will use placement results from the nesting algorithm instead of the original board transforms. Document transforms remain authoritative for editing in 3D, while nesting placements are a derived manufacturing layout.

Why:
- The nesting layout should be free to reposition boards without mutating the main design document.
- This avoids conflicts between manufacturing layout and editing transforms.

Alternative considered:
- Mutate the main document with packed positions. Rejected because it would conflate edit-space and output-space semantics.

## Risks / Trade-offs

- [Rectangle-first packing can waste sheet area for rounded or irregular boards] → Mitigation: keep the nesting output explicitly approximation-based in the first pass and leave room for polygon packing later.
- [Users may expect 2D edits that no longer exist] → Mitigation: update UI copy and cursor behavior so the 2D surface clearly reads as an output preview, not an editor.
- [Derived nesting data can drift from visual expectations if board bounds are computed inconsistently] → Mitigation: centralize board footprint derivation in one packing helper and reuse it for rendering.
- [Large board sets can make repacking expensive] → Mitigation: keep the packing input lightweight and memoize derived layouts in the UI layer.
