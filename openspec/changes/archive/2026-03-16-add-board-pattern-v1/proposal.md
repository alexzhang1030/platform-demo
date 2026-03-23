## Why

The repository only had a frontend skeleton, while `docs/CRAFT.md` defines a board pattern workflow with an editor and a generator. This change establishes the first usable product loop so the team can validate the workflow before investing in heavier CAD-like features.

## What Changes

- Add a versioned pattern document protocol with shared TypeScript interfaces, JSON parsing, and schema validation.
- Add a pure core package for geometry sampling, lightweight 3D preview projection, document bounds, and SVG generation.
- Replace the default web app starter with a routed board pattern studio that includes a landing page, an editor, and a generator.
- Implement a v1 editor with preset board creation, outline point editing in SVG, board property editing, and pattern JSON export.
- Implement a v1 generator with pattern JSON import, validation feedback, SVG preview, exported SVG payload display, and SVG download.

## Capabilities

### New Capabilities
- `pattern-document`: Defines the shared versioned board pattern document, parsing rules, and import/export behavior.
- `board-editor`: Covers the in-browser editing workflow for board presets, 2D outline manipulation, and synchronized preview state.
- `svg-generator`: Covers generator-side validation, board layout preview, and SVG document export from a pattern document.

### Modified Capabilities
- None.

## Impact

- Adds new workspace packages: `@platform-demo/protocol` and `@platform-demo/core`.
- Updates the `web` app to depend on the new packages and expose `/editor` and `/generator`.
- Adds a root `zod` dependency for schema validation.
- Establishes the first public document contract: `PatternDocument` version `1.0`.
