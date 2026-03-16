## Why

The current web app still carries a separate home route and uses more layout spacing than the editor-first workflow needs. That leaves too much UI chrome around the actual workspace and wastes valuable screen area in a tool that should feel dense, direct, and production-oriented.

## What Changes

- Remove the home page from the studio flow and make the app focus directly on `editor` and `generator`.
- Tighten the global shell and workspace layout so the top bar, left panel, right panel, and center workspace use minimal gaps and padding.
- Make editor and generator screens read as a compact single-screen tool rather than a marketing-style app shell.
- Reduce non-essential copy, spacing, and decorative wrappers that do not directly support editing or generation.

## Capabilities

### New Capabilities
- `studio-workspace-ui`: Covers direct editor and generator entry, compact shell layout, and dense single-screen workspace presentation.

### Modified Capabilities
- None.

## Impact

- Updates routing and page entry behavior in `apps/web`.
- Tightens shell and panel layout components in the pattern studio UI.
- Removes the standalone home-page workflow from the active product surface.
