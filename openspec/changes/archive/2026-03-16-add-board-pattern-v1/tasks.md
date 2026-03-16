## 1. Shared protocol and core packages

- [x] 1.1 Add `@xtool-demo/protocol` with the `PatternDocument` interfaces, preset shape builders, JSON serialization, and zod-backed parsing.
- [x] 1.2 Add `@xtool-demo/core` with geometry sampling, transformed board bounds, lightweight preview projection, and SVG document generation.

## 2. Web app workflow

- [x] 2.1 Replace the starter page in `apps/web` with a landing page plus `/editor` and `/generator` flows in the same app.
- [x] 2.2 Implement the editor workflow with board presets, board selection, board inspector updates, outline point dragging, and pattern JSON export.
- [x] 2.3 Implement the generator workflow with JSON upload, validation feedback, active document preview, SVG payload rendering, and SVG download.

## 3. Validation and polish

- [x] 3.1 Wire workspace dependencies and TypeScript path mappings so the web app consumes the new protocol and core packages.
- [x] 3.2 Fix generator payload overflow so long SVG markup remains bounded inside the panel.
- [x] 3.3 Verify the implementation with `bun run build` in `apps/web` and `bun run typecheck` from the repository root.
