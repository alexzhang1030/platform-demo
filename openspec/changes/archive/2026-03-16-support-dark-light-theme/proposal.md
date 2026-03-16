## Why

The app already ships a theme provider, but the studio UI is still effectively hard-coded for a light surface and does not expose a complete, user-facing dark or light theme experience. We need to close that gap now so the editor and generator feel consistent with the rest of the shadcn-based stack and remain usable in low-light workflows.

## What Changes

- Add first-class light and dark theme support across the studio shell, editor, generator, and shared controls.
- Add a visible theme switcher so users can choose light, dark, or system theme without relying on keyboard shortcuts.
- Replace hard-coded light-only surface, border, text, and overlay styles with theme-aware tokens and variants.
- Ensure 2D and 3D workspaces keep clear contrast, selection states, and floating control visibility in both themes.
- Persist the selected theme and apply it on initial load without flashing the wrong theme.

## Capabilities

### New Capabilities
- `studio-theming`: Support user-selectable light, dark, and system themes across the studio UI with consistent contrast and persisted preference.

### Modified Capabilities

## Impact

- Affected code: [`apps/web/src/components/theme-provider.tsx`](/Users/alex/company/xtool/demo/apps/web/src/components/theme-provider.tsx), [`apps/web/src/components/pattern-studio/chrome.tsx`](/Users/alex/company/xtool/demo/apps/web/src/components/pattern-studio/chrome.tsx), [`apps/web/src/components/pattern-studio/editor-page.tsx`](/Users/alex/company/xtool/demo/apps/web/src/components/pattern-studio/editor-page.tsx), [`apps/web/src/components/pattern-studio/generator-page.tsx`](/Users/alex/company/xtool/demo/apps/web/src/components/pattern-studio/generator-page.tsx), [`apps/web/src/components/pattern-studio/board-preview-3d.tsx`](/Users/alex/company/xtool/demo/apps/web/src/components/pattern-studio/board-preview-3d.tsx), and app-level styling entrypoints.
- Affected UX: root workspace routing stays the same, but header controls and visual tokens gain theme support.
- Dependencies: no major new dependency is required; the change should build on the existing theme provider and shadcn-compatible class strategy.
