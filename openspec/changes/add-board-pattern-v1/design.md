## Context

The repository started as a monorepo skeleton with a single `apps/web` starter app and a shared UI package. `docs/CRAFT.md` defines a board editing workflow with an editor and a generator, but there was no shared document contract, no geometry layer, and no user-facing workflow.

This change needed a minimal architecture that could ship quickly without locking the project into a heavy CAD stack. The implementation also had to respect project constraints: TypeScript without `as` assertions, simple maintainable code, and a clean Tailwind-based UI.

## Goals / Non-Goals

**Goals:**
- Establish a single source of truth for board patterns with a versioned JSON document.
- Separate protocol and geometry logic from React so later editor features can reuse the same core behavior.
- Deliver a working v1 product loop: create/edit boards in `editor`, export JSON, import JSON in `generator`, and export SVG.
- Provide a lightweight 3D-style preview without introducing a complex rendering dependency before the data model is stable.

**Non-Goals:**
- Full CAD behavior such as snapping, joinery generation, Boolean operations, nesting, or manufacturing compensation.
- Direct 3D editing.
- Multi-file project management, collaboration, persistence, or undo/redo history.

## Decisions

### Keep editor and generator in one web app
The implementation keeps the existing `apps/web` package and uses browser history routing for `/editor` and `/generator`.

This was chosen over splitting into multiple apps because:
- the repository already had a single app entrypoint;
- the editor and generator share the same pattern document contract;
- v1 values iteration speed over deployment isolation.

### Introduce protocol and core as separate workspace packages
`@xtool-demo/protocol` owns the `PatternDocument` schema, zod validation, default document creation, and JSON serialization. `@xtool-demo/core` owns geometry sampling, bounds calculation, lightweight preview generation, and SVG emission.

This separation keeps React components thin and avoids mixing view state with domain logic. It also creates a clear extension path for future generator features or a separate app without refactoring the document contract again.

### Use JSON plus zod for the first document format
The document format is `PatternDocument` version `1.0`, stored as JSON and validated through zod before generator import.

This was chosen over YAML because the repository is TypeScript-first and generator import/export needed strict parsing and actionable validation errors more than manual editability.

### Limit v1 editing to SVG outline point manipulation
The editor supports adding preset boards, editing board metadata, moving board transforms, and dragging outline points in a 2D SVG canvas.

This was chosen over path authoring tools or 3D editing because:
- it proves the document round-trip quickly;
- it keeps state transitions explicit;
- it avoids premature abstraction around complex geometry operations.

### Use projected SVG faces for depth preview
The “3D preview” uses projected polygons derived from sampled board outlines and thickness. It looks volumetric but stays inside standard SVG rendering.

This was chosen over Three.js or React Three Fiber in v1 because:
- the requirement was preview, not full 3D manipulation;
- the repo did not already depend on Three.js;
- a lightweight projection keeps the feature deterministic and easy to test.

## Risks / Trade-offs

- [Rounded and curved outlines are flattened during point editing] → Accept in v1; presets can start curved, but once edited they become explicit line segments. This keeps editing logic simple while preserving the exported closed shape.
- [The 3D preview is illustrative rather than geometrically exact] → Keep preview logic in `@xtool-demo/core` and treat it as a replaceable adapter when real 3D rendering becomes necessary.
- [Custom routing is intentionally minimal] → Accept for v1 because the route surface is small. If the app grows beyond a few routes, migrate to a dedicated router library.
- [Generator output does not include manufacturing intelligence] → Make this explicit in specs so later work can extend SVG generation without breaking the existing contract.
