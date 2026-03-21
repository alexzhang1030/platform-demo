## Context

The current board creation tools require precise click-drag-click interactions. The Smart Pen tool aims to provide a more natural, fluid way to prototype by interpreting freehand sketches on the ground plane.

## Goals / Non-Goals

**Goals:**
- Implement a `pen-sketch` tool that records freehand mouse/pointer paths.
- Classify closed loops as either "Rectangle" (enclosure) or "Circle" (panel).
- Automatically generate precisely aligned boards from these sketches.
- Automatically group generated enclosure boards.

**Non-Goals:**
- **Complex Gesture Recognition**: We won't support complex shapes like stars or L-shapes in the MVP.
- **Stroke Width Support**: The line thickness of the sketch will not influence the board thickness.
- **Editability of the Sketch**: Once a sketch is committed and converted to boards, the original sketch path is discarded.

## Decisions

### 1. Classification Algorithm (Heuristic-based)
We will use a geometric heuristic rather than a machine learning model for the MVP.
- **Rectangularity**: `Area(Path) / Area(BoundingBox)`. If > 0.8, it's a rectangle.
- **Circularity**: `Area(Path) / (Perimeter(Path)^2 / (4 * PI))`. If > 0.8, it's a circle.
- **Rationale**: These heuristics are fast, simple to implement, and sufficient for the constrained environment of a ground-plane footprint.

### 2. Resulting Geometry
- **Rectangle (Enclosure)**: Creates 4 `upright` boards forming a frame around the bounding box.
- **Circle (Panel)**: Creates 1 `flat` circular board with a radius matching half the average of the bounding box sides.
- **Rationale**: This matches the "Hollow Frame" mental model where a box sketch implies a volume.

### 3. Tool State Integration
A new `pen-sketch` state will be added to the `EditorTool` type.
- **Interaction**: `onPointerDown` starts recording, `onPointerMove` appends points and updates a live SVG preview, `onPointerUp` triggers classification and commit.

## Risks / Trade-offs

- **[Risk] False Positives** → A user might draw a messy circle that is classified as a rectangle. **Mitigation**: Ensure the bounding box preview is visible, and allow the user to Undo (`Cmd+Z`) the generated boards easily.
- **[Risk] Performance** → High-frequency pointer events could generate a massive number of points. **Mitigation**: Sample points with a minimum distance threshold (e.g., 5mm) to keep the path lean.
