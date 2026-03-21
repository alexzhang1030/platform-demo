## Context

Feedback from initial testing showed that freehand drawing was difficult to control. A point-based "Smart Polygon" tool provides better precision while still allowing for rapid layout generation.

## Goals / Non-Goals

**Goals:**
- Implement a point-collection mode for shape definition.
- Support real-time visualization of the polygon boundary.
- Convert committed polygons into enclosures (rectangles) or panels (circles).
- Allow finishing the shape via double-click.

**Non-Goals:**
- **Bezier Curves**: Only linear segments between control points are supported for the sketch.
- **Snapping**: While we could snap to the grid, the priority is the "sketch-like" feel of point placement.

## Decisions

### 1. Interaction Model
- **Click**: Adds a point to the current sketch.
- **Move**: Shows a "rubber-band" line from the last point to the cursor.
- **Double-Click / Button Click**: Commits the sketch.
- **Rationale**: This is a standard CAD interaction pattern that balances speed and precision.

### 2. Visualization
We will use a Three.js `Line` with a `BufferGeometry` that updates its vertex data whenever a point is added or the cursor moves.
- **Closing Segment**: If > 2 points, render a dashed line from the cursor back to the first point to indicate closure.

### 3. Classification Heuristics
- **Rectangle**: If point count is 4 (or 3-6) and the area matches the bounding box area > 85%.
- **Circle**: If point count is high (8+) or if the distance from the centroid to all points has low variance.

## Risks / Trade-offs

- **[Risk] Unintentional Clicks** → Users might click once and then want to cancel. **Mitigation**: Pressing `Esc` clears the current points.
- **[Risk] Degenerate Shapes** → Polygons with self-intersecting lines. **Mitigation**: For the MVP, we assume simple convex/concave polygons and use the bounding box for the final board generation.
