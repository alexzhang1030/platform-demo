## Why

Freehand drawing can be imprecise and difficult to control in a 3D workspace. Introducing a "Control Point" workflow allows users to click to define precise vertices of a shape. This data can then be used to accurately generate circular panels or rectangular enclosures, combining the speed of sketching with the precision of point-based placement.

## What Changes

- **Smart Pen (Point-based)**: Instead of freehand drag, the tool now collects points on each click.
- **Visual Feedback**: Real-time line segments connecting the control points during placement.
- **Classification & Commit**:
    - A "Commit" button or double-click finishes the shape.
    - If the points roughly form a circle, generate one flat circular board.
    - If the points roughly form a rectangle, generate four upright boards (enclosure).
- **Toolbar Update**: Rename "Smart Pen" to "Smart Polygon" or keep "Smart Pen" but update the interaction model.

## Capabilities

### New Capabilities
- `pattern-studio-pen-sketch`: Capability for point-based shape recognition and conversion to board primitives.

### Modified Capabilities
None.

## Impact

- `apps/web/src/components/pattern-studio/editor-page.tsx`: Updated pointer logic to collect discrete points.
- `apps/web/src/lib/pattern-studio.ts`: Logic to handle a list of vertices and classify the resulting polygon.
- `apps/web/src/components/pattern-studio/board-preview-3d.tsx`: Render discrete control point markers and segments.
