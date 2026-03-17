## Context

The current editor PiP is implemented inside `editor-page.tsx` as a draggable inset with hard-coded sizing behavior that has become muddled as the workspace-first layout evolved. What matters now is not arbitrary resizing but a clear three-step progression: small floating PiP, larger floating PiP, and fullscreen workspace takeover. We also still need to avoid paying the render cost of the underlying WebGPU 3D view when the PiP visually hides it.

This change sits at the intersection of UI layout and rendering behavior. It affects the PiP state model, the level-switching and drag interaction logic, and the conditions under which `BoardPreview3D` should be mounted or skipped. The key constraint is to keep the implementation local to the editor page without introducing a generalized window manager.

## Goals / Non-Goals

**Goals:**
- Support compact, expanded, and fullscreen PiP levels for the editor.
- Keep floating PiP anchored to the bottom-right corner with drag offset and reset support.
- Stop rendering the hidden 3D preview while fullscreen PiP is active.
- Keep the implementation simple and local to `editor-page.tsx` or a nearby helper.

**Non-Goals:**
- Add arbitrary multi-window docking or a generic panel manager.
- Support freeform edge resizing for the PiP.
- Apply PiP size/fullscreen behavior to generator overlays or other editor panels.
- Change board editing semantics, data flow, or 2D canvas interaction behavior.
- Introduce animation libraries or new layout dependencies.

## Decisions

### 1. Replace boolean expand state with explicit PiP level state
The PiP will move from ad hoc expand behavior to a small explicit state object that tracks the current level and the bottom-right floating offset.

Why:
- Compact, expanded, and fullscreen are easy to reason about as explicit levels.
- We no longer need to persist arbitrary dimensions once freeform resizing is removed.
- A single explicit state object is easier to reason about than multiple ad hoc flags.

Alternative considered:
- Keep `isInsetExpanded` and add more preset sizes. Rejected because it obscures the intended three-level model.

### 2. Use bottom-right anchored preset sizes
The PiP already behaves like a bottom-right floating utility window. Compact and expanded levels will preserve that anchor model and use fixed preset sizes rather than freeform resize handles.

Why:
- It matches the current default placement.
- It minimizes collision with other overlays.
- It keeps position math compatible with the recent bottom-right drag model.

Alternative considered:
- Keep freeform resize handles. Rejected because the user no longer wants arbitrary sizing and the extra pointer logic adds noise.

### 3. Fullscreen PiP will unmount or skip `BoardPreview3D`
When the PiP covers the main workspace, the editor will not render the hidden 3D preview behind it.

Why:
- The user explicitly wants GPU/CPU savings.
- If the 3D view is fully occluded, continuing WebGPU rendering is wasted work.
- Conditional rendering is simpler and more reliable than trying to throttle R3F frame loops indirectly.

Alternative considered:
- Keep the 3D view mounted and only lower its frame rate. Rejected because it still burns unnecessary resources and adds more renderer coordination complexity.

### 4. Maximize control cycles through the three levels
The maximize affordance will be the single size control. Each activation advances the PiP through compact, expanded, and fullscreen, then loops back to compact.

Why:
- It keeps the toolbar minimal.
- It exposes all three states without adding more buttons.
- It makes “fullscreen” mean the true maximum workspace takeover instead of a vague larger preset.

Alternative considered:
- Add a second dedicated fullscreen button. Rejected because the current maximize affordance can carry the entire level model cleanly.

## Risks / Trade-offs

- [Preset sizes may feel less flexible than freeform resize] → Mitigation: keep the expanded level large enough to be useful and keep fullscreen one click away.
- [Unmounting the 3D preview in fullscreen could reset transient viewer state] → Mitigation: only do this in split mode, and preserve existing editor state outside the 3D component so remount is acceptable.
- [Fullscreen PiP may obscure editor overlays users still need] → Mitigation: define fullscreen as covering the main workspace region, not the global shell chrome.
- [A richer PiP state model increases editor-page complexity] → Mitigation: encapsulate geometry helpers and level transitions in small local utilities rather than scattering conditionals.

## Migration Plan

1. Introduce an explicit PiP level model with floating offset and fullscreen mode.
2. Replace freeform sizing with compact and expanded preset geometry.
3. Wire the maximize control to cycle the PiP through compact, expanded, and fullscreen.
4. Skip `BoardPreview3D` rendering while fullscreen PiP is active.
5. Validate drag, level switching, restore, and split-workspace behavior.

Rollback is straightforward: revert to the current fixed-size PiP with always-mounted `BoardPreview3D`.

## Open Questions

- Whether the expanded preset should be slightly taller on shorter laptop viewports.
- Whether fullscreen PiP should still reserve space for the bottom workspace tray or temporarily cover it as part of the main stage takeover.
