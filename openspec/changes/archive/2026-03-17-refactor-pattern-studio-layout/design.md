## Context

`lib/editor/docs/layout.md` describes an editor centered on a full-size canvas with layered controls floating above it. By contrast, `apps/web` currently renders both the editor and generator as bordered, split-page compositions: fixed sections consume width up front, the shell header behaves like a page frame, and the preview surface is treated as one panel among others instead of the product's main stage.

The gap matters because recent WebGPU and interaction work increased the value of the workspace itself, but the surrounding layout still constrains it. This change is cross-cutting across `chrome.tsx`, `editor-page.tsx`, and `generator-page.tsx`, and it needs a single layout model that can later absorb more advanced overlay UI without forcing another full shell rewrite.

## Goals / Non-Goals

**Goals:**
- Convert the studio shell to a workspace-first layout model inspired by `lib/editor/docs/layout.md`.
- Give the editor's 2D/3D workspace the dominant viewport area.
- Give the generator's SVG preview the same dominant treatment so both routes feel part of one tool.
- Move supporting controls into overlay sidecars, floating strips, or inset panels that preserve workspace space.
- Keep the current route structure, data flow, and editing/export capabilities intact.

**Non-Goals:**
- Reproduce the full `lib/editor` UI system, tool stack, or state model.
- Add new editing tools, viewer overlays, or property systems beyond layout needs.
- Change protocol data shapes, navigation routes, or core board editing logic.
- Introduce a new design system or large layout framework.

## Decisions

### 1. Use one shared canvas-first shell instead of separate page layouts
The shell in `chrome.tsx` will become a common workspace container for editor and generator, with top navigation treated as floating or lightly inset chrome rather than as a heavy framed header.

Why:
- Both routes need the same spatial hierarchy.
- It keeps layout behavior predictable when switching between editor and generator.
- A shared shell avoids duplicating overlay positioning logic.

Alternative considered:
- Redesign editor and generator independently. Rejected because the routes would continue to feel like separate apps and future layout changes would duplicate work.

### 2. Treat support UI as overlays, not columns first
The editor and generator will still expose their current controls, but those controls will be organized into overlay panels or floating trays that sit on top of the workspace instead of claiming equal grid columns by default.

Why:
- This is the primary behavior difference between the current app and the documented reference layout.
- It increases workspace size without removing functionality.
- Overlay composition can scale toward richer tool UIs later.

Alternative considered:
- Keep permanent side columns and only restyle them. Rejected because it does not solve the workspace-priority problem.

### 3. Keep the implementation incremental and route-local
The change will restructure `editor-page.tsx` and `generator-page.tsx` around a small number of local layout helpers instead of inventing a generic docking system.

Why:
- The product only has two routes in scope.
- A simple local layout is easier to implement, test, and revise.
- The repo guidance explicitly favors maintainable, low-complexity solutions.

Alternative considered:
- Build a generalized resizable panel manager up front. Rejected as overengineering for the current scope.

### 4. Preserve current feature affordances while changing spatial hierarchy
Existing controls such as workspace mode toggles, export actions, JSON import, parse diagnostics, and board metadata will remain present, but they may move into different visual containers or overlay groupings.

Why:
- The change is about layout, not functional reduction.
- Preserving existing behavior keeps the refactor easier to validate.

Alternative considered:
- Drop low-priority controls temporarily to simplify the redesign. Rejected because it would blur whether regressions came from layout or capability removal.

## Risks / Trade-offs

- [Overlay panels can obscure the workspace if they are too large] → Mitigation: keep panels compact by default and anchor them to edges with clear visual hierarchy.
- [Moving controls may hurt discoverability for users familiar with the current split layout] → Mitigation: keep major control groups intact and place them in conventional overlay positions such as top bars, side cards, and bottom trays.
- [Editor and generator may diverge if route-specific needs push custom layouts too far] → Mitigation: define a shared shell and shared layout vocabulary before route-level variation.
- [A more immersive layout may expose weak visual contrast in some panels] → Mitigation: tune panel surfaces and backdrop blur together with the new structure rather than transplanting old card styles unchanged.

## Migration Plan

1. Refactor the shared studio shell into a workspace-first container.
2. Restructure the editor around a dominant workspace plus overlay control regions.
3. Restructure the generator to mirror the same layout model.
4. Validate that editor/generator workflows still function and adjust overlay sizing for usability.

Rollback is straightforward: revert the shell and route layout files to the existing split-panel structure.

## Open Questions

- Whether the editor should keep its board list permanently open as a left overlay or collapse it into a lighter tray on smaller screens.
- Whether the generator should expose JSON source and parse diagnostics as separate overlays or combine them into one stacked side panel.
