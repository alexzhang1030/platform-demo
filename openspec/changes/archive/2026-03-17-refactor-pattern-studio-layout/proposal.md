## Why

The current pattern studio pages still behave like conventional split-panel app screens, while `lib/editor/docs/layout.md` defines a canvas-first editor where UI layers float above the workspace instead of consuming it. We need to align the web studio layout now so the editor feels like a real workspace, gives the 2D/3D canvas more room, and establishes a consistent shell for future tool overlays.

## What Changes

- Refactor the pattern studio shell to support a canvas-first workspace with floating chrome instead of a document-style page frame.
- Rework the editor layout so the primary 2D/3D workspace owns the full available area and supporting controls move into overlay panels and floating bars.
- Rework the generator layout to follow the same shell logic, with the preview surface prioritized and import/export utilities treated as supporting overlays.
- Keep current editor and generator capabilities intact while changing where controls live and how the workspace is partitioned.
- Exclude deeper tool-system parity with `lib/editor` such as selection managers, 3D HTML action menus, or fully dynamic property inspectors from this change.

## Capabilities

### New Capabilities
- `pattern-studio-layout`: Support a canvas-first studio layout with floating shell chrome, overlay side panels, and workspace-priority editor/generator surfaces.

### Modified Capabilities

## Impact

- Affected code: `apps/web/src/components/pattern-studio/chrome.tsx`, `apps/web/src/components/pattern-studio/editor-page.tsx`, `apps/web/src/components/pattern-studio/generator-page.tsx`, and likely new colocated layout helper components.
- Affected UX: editor and generator navigation stays the same, but sidebars, headers, and utility controls move into overlay-style shells that preserve more room for the preview area.
- Dependencies: no new dependency is required; the change should build on the existing React, Tailwind, Base UI, and current studio components.
