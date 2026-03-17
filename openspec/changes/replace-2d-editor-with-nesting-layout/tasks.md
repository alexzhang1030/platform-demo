## 1. Packing foundation

- [x] 1.1 Add a nesting/packing module in `packages/core` that derives packable board footprints from the current document
- [x] 1.2 Implement a deterministic rectangular packing algorithm in `packages/core` that lays out board footprints into one or more sheets without overlap
- [x] 1.3 Add tests or verifiable helpers for packing edge cases such as mixed sizes and multi-sheet overflow

## 2. 2D nesting view

- [x] 2.1 Replace the current 2D editor canvas rendering with a derived nesting layout surface backed by the shared core packing result
- [x] 2.2 Remove direct 2D interactions including board drag, point drag, and 2D create-board behavior
- [x] 2.3 Render packed board placements, sheet boundaries, and lightweight production-oriented annotations in the 2D panel

## 3. Editor integration

- [x] 3.1 Keep the 3D workspace as the primary interactive editor surface while wiring the 2D panel to the new derived nesting result
- [x] 3.2 Update split view, PiP, and related copy so the 2D panel reads as nesting/output rather than editing
- [x] 3.3 Run `bun run --cwd apps/web typecheck` and `bun run --cwd apps/web build`
