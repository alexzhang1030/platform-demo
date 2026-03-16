## Context

The current studio already behaves like a tool, but it still carries a separate home route and more spacing than the workflow needs. The result is a UI that looks lighter than the task demands, especially on desktop where the workspace should dominate and shell chrome should stay secondary.

This change is limited to the web app shell and page composition in `apps/web`. It does not change the document model or interaction model; it changes how directly users enter the tool and how compactly the editor and generator consume the screen.

## Goals / Non-Goals

**Goals:**
- Remove the standalone home page from the active navigation flow.
- Make the application enter directly into the tool surfaces: editor and generator.
- Reduce gaps, padding, and non-essential framing across the top bar, side panels, and workspace.
- Keep editor and generator within a dense single-screen layout that preserves internal scrolling where needed.

**Non-Goals:**
- Reworking the editing feature set or generator logic.
- Introducing a new router library or navigation pattern.
- Adding new visual ornamentation to replace removed spacing.

## Decisions

### Use editor as the default route
The app will resolve `/` to the editor rather than rendering a separate landing page.

This is preferred over keeping a compact home page because the product is now tool-first, not marketing-first, and a separate starting screen adds friction without adding workflow value.

### Keep editor and generator as the only first-class destinations
The shell will expose only `editor` and `generator`, with a tighter header and reduced text density.

This is preferred over preserving descriptive shell copy because the current audience already understands the tool surface and benefits more from space than explanation.

### Compress layout by flattening panel chrome
The top bar, sidebars, and center workspace will reduce padding, gaps, and decorative separation. Scrolling will remain inside panels instead of on the page.

This is preferred over rebuilding the layout from scratch because the current panel structure already supports the workflow and only needs denser spacing rules.

### Remove low-value copy before removing controls
The first compression step will remove or shorten labels, helper text, and non-essential wrappers before removing any controls that still support the workflow.

This is preferred over pure visual compression because dense tools fail quickly when they keep the same amount of copy in a smaller space.

## Risks / Trade-offs

- [Removing the home page reduces discoverability for first-time users] → Make editor the default and keep generator as an explicit top-level destination so entry remains simple.
- [Aggressive compaction can hurt legibility] → Reduce spacing and copy first, but keep clear typography contrast and panel boundaries.
- [Editor and generator may diverge visually after shell tightening] → Apply shell and spacing changes through shared layout components before page-specific adjustments.
