## 1. Interaction & State

- [x] 1.1 Update `handleSketchStart` and `handleSketchMove` in `EditorPage.tsx` to handle discrete point collection rather than continuous drag.
- [x] 1.2 Implement a "Finish Sketch" function that triggers `commitSketch`.
- [x] 1.3 Add a "Commit" button to the editor overlay when points are active.

## 2. 3D Preview Updates

- [x] 2.1 Update `SketchPath` in `BoardPreview3D.tsx` to render discrete control point markers (small spheres).
- [x] 2.2 Implement a "rubber-band" line in `BoardPreview3D` that follows the cursor from the last placed point.
- [x] 2.3 Add a "close path" segment visualization once 3 points are placed.

## 3. Refinement & Logic

- [x] 3.1 Update `classifySketchPath` heuristic to work better with low vertex counts (e.g., exactly 4 points for rectangle).
- [x] 3.2 Implement double-click handler on the ground plane to finish the sketch.
- [x] 3.3 Verify end-to-end: click 4 points -> double-click -> enclosure appears.
