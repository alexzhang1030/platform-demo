## Context

The web app already mounts a custom `ThemeProvider` and toggles `light` / `dark` classes on the document root, but the studio UI still relies on hard-coded light-only Tailwind utility values such as `bg-white`, `text-black`, and light oklch backgrounds. As a result, the editor shell, generator panels, floating viewport controls, and 3D canvas chrome do not respond coherently to theme state even though the runtime theme infrastructure exists.

This change is cross-cutting because it touches shared shell components, editor and generator layouts, floating controls, and theme application behavior. It also needs a consistent user-facing control so the theme can be selected without relying on the current hidden keyboard shortcut.

## Goals / Non-Goals

**Goals:**
- Expose a visible theme control that supports `light`, `dark`, and `system`.
- Make the main studio shell, editor, generator, and floating controls render with theme-aware colors and contrast.
- Ensure theme preference persists and applies cleanly on load.
- Keep 2D and 3D interaction affordances legible in both themes without changing workflow behavior.

**Non-Goals:**
- Rework layout structure, routing, or editor interaction behavior.
- Add a separate design system package or broad token framework.
- Change board colors or domain data formats.
- Add per-panel independent theme overrides.

## Decisions

### 1. Use the existing document-root theme class strategy
We will keep the existing `ThemeProvider` and root `light` / `dark` class mechanism instead of adding `next-themes` or another dependency.

Why:
- The app already has a working provider and persistence model.
- The required scope is UI styling, not theme state architecture.
- Avoids unnecessary migration or duplicate theme state.

Alternative considered:
- Replace the current provider with a third-party theming package. Rejected because it adds dependency and migration cost without solving a problem the current provider cannot handle.

### 2. Introduce a visible theme switcher in shared studio chrome
The main shell header will host a compact theme control so editor and generator share the same entry point.

Why:
- The header is the only persistent UI across routes.
- It avoids duplicating theme controls inside editor and generator panels.
- It aligns with the compact workspace goal by keeping global controls in global chrome.

Alternative considered:
- Add the theme toggle only inside the editor. Rejected because generator needs the same behavior and it would create route inconsistency.

### 3. Convert hard-coded light surfaces to theme-aware utility combinations
We will replace light-only values in the studio components with paired `dark:` variants or theme-aware utility tokens, focusing on surfaces, text, borders, overlays, and shadow contrast.

Why:
- The current issue is mostly presentation-level, not logic-level.
- Localized utility updates are simpler and easier to maintain than introducing a larger abstraction layer.
- This preserves the current component structure.

Alternative considered:
- Introduce a new semantic token layer for every surface before enabling dark mode. Rejected for now because the codebase is small and the immediate need is product behavior, not a full token refactor.

### 4. Treat 2D and 3D workspaces as first-class themed surfaces
The SVG editor background, PiP panel, 3D preview wrapper, gizmos, and floating control groups must all remain visible and distinct in dark mode.

Why:
- These are the highest-usage surfaces in the app.
- Generic shell theming alone would still leave critical controls unreadable.

Alternative considered:
- Theme only the shell and keep canvases light. Rejected because the contrast break would feel unfinished and visually inconsistent.

## Risks / Trade-offs

- [Dark mode reduces contrast for fine geometry controls] → Mitigation: explicitly tune control fills, borders, labels, and overlay backgrounds rather than relying on inherited colors alone.
- [Mixed light-only utility classes remain in less obvious subcomponents] → Mitigation: audit the full studio component tree and update shared shell pieces before considering the work complete.
- [Theme switch causes a visible flash on initial load] → Mitigation: keep persisted preference in local storage and ensure the provider applies the resolved theme immediately on mount.
- [3D scene chrome may not match the rest of the UI perfectly] → Mitigation: scope this change to wrapper surfaces, overlay controls, and contrast-critical accents; do not block on deeper renderer-level styling.

## Migration Plan

1. Add the visible theme switcher to the shared studio shell.
2. Convert shell, editor, generator, and floating control surfaces to theme-aware styles.
3. Update 2D and 3D workspace wrappers for dark-mode contrast.
4. Validate persistence, route transitions, and system-theme behavior.

Rollback is straightforward: revert the styling and header theme control changes while retaining the existing provider.

## Open Questions

- Whether the product should continue exposing the keyboard shortcut once the visible switcher exists.
- Whether `system` should be shown as a third explicit state in the compact control or folded into a secondary menu if space becomes too tight.
