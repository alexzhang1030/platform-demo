## Why

Building 3D models from scratch currently requires a high degree of precision and multiple clicks. A freehand sketching tool will allow users to quickly "doodle" a footprint and have the system automatically interpret and convert it into precise 3D boards, significantly speeding up the prototyping phase.

## What Changes

- **Pen Sketch Tool**: A new tool in the 3D workspace that allows freehand drawing on the ground plane.
- **Gesture Recognition**: An algorithm to classify freehand paths as either a circle or a rectangle.
- **Smart Conversion**:
    - **Circle Sketch**: Converts to a single flat circular board.
    - **Rectangle Sketch**: Converts to four upright boards forming a hollow enclosure.
- **UI Tool Selection**: Add a "Pen" icon to the editor toolbar.

## Capabilities

### New Capabilities
- `pattern-studio-pen-sketch`: High-level capability for freehand shape recognition and conversion to board primitives.

### Modified Capabilities
None.

## Impact

- `apps/web/src/components/pattern-studio/editor-page.tsx`: New tool state and freehand event handling.
- `apps/web/src/lib/pattern-studio.ts`: New `commitSketch` logic and primitive detection algorithms.
- `packages/core/src/`: Potential new geometry utilities for shape fitting.
