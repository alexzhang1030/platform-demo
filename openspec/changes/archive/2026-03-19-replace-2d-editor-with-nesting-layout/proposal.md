## Why

The current 2D workspace still carries editor-style interaction assumptions, but that no longer matches the product direction. The 2D area should become a laser-cutter-oriented nesting view for arranged board outputs, not a second editing surface, and it now needs a reliable packing strategy instead of manual placement logic.

## What Changes

- Remove direct 2D editing interactions such as board dragging, point editing, and 2D create-board behavior from the pattern studio editor.
- Replace the 2D surface with a nesting/layout view that arranges boards for laser-cut output.
- Add automatic arrangement using a matrix/bin-packing style nesting algorithm rather than manual free placement.
- Keep the 3D workspace as the primary interactive editing surface while the 2D view becomes a production-oriented output preview.
- Update split view and fullscreen PiP behavior so the 2D panel presents arranged nesting results instead of editable geometry.

## Capabilities

### New Capabilities
- `pattern-studio-nesting-layout`: Defines the 2D nesting surface, automatic board arrangement behavior, and output-oriented presentation for laser cutter workflows.

### Modified Capabilities
- `pattern-studio-layout`: Changes the role of the 2D workspace inside the studio layout from an editable canvas to a nesting/output panel.

## Impact

- Affected code: `apps/web/src/components/pattern-studio/editor-page.tsx`, `apps/web/src/components/pattern-studio/board-preview-3d.tsx`, and likely new nesting helpers under `apps/web/src/lib/`.
- Affected UX: editor workspace mode behavior, split view expectations, PiP content, and 2D panel interaction rules.
- Dependencies: no new heavy UI dependencies are expected, but this change will likely introduce a packing/nesting algorithm implementation or a small matrix/bin-packing utility for board arrangement.
