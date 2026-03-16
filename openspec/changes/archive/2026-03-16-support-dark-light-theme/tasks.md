## 1. Theme controls

- [x] 1.1 Add a visible shared theme control to the studio chrome with `light`, `dark`, and `system` options
- [x] 1.2 Ensure the theme control reflects the currently selected theme and updates persisted theme state

## 2. Theme-aware studio surfaces

- [x] 2.1 Convert the shared shell, editor, and generator panels from light-only classes to theme-aware styles
- [x] 2.2 Update floating overlays, buttons, tooltips, and PiP surfaces so they remain legible in both light and dark themes
- [x] 2.3 Update 2D and 3D workspace wrapper styling so canvas-adjacent chrome keeps clear contrast in both themes

## 3. Theme behavior validation

- [x] 3.1 Verify persisted theme selection and `system` mode behavior through the existing theme provider
- [x] 3.2 Run typecheck and production build after the theme updates
- [x] 3.3 Manually verify editor and generator appearance in light, dark, and system themes
