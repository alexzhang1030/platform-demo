## 1. Shared shell refactor

- [x] 1.1 Refactor the pattern studio shell into a workspace-first container with lighter floating route chrome
- [x] 1.2 Add local layout helpers or shell regions for overlay side panels, top bars, and bottom trays as needed

## 2. Editor layout restructuring

- [x] 2.1 Rework the editor page so the 2D/3D board workspace becomes the dominant surface
- [x] 2.2 Move board list, board settings, workspace mode toggles, and export actions into overlay panels or floating bars
- [x] 2.3 Ensure the editor layout still works across desktop and smaller viewport widths without hiding critical controls

## 3. Generator layout restructuring

- [x] 3.1 Rework the generator page so the SVG preview becomes the dominant surface
- [x] 3.2 Move import/export, parse status, and source markup into supporting overlay regions consistent with the editor shell

## 4. Validation

- [x] 4.1 Verify editor workflows still support board selection, board editing, workspace mode switching, and export
- [x] 4.2 Verify generator workflows still support JSON import, editor document reuse, parse issue visibility, and SVG export
- [x] 4.3 Run `bun run --cwd apps/web typecheck` and `bun run --cwd apps/web build`
