## Context

Currently, the system only supports 'flat' and 'upright' boards. This limitation prevents users from building common structures like pitched roofs or angled braces. The "Hinge Extrude" tool is designed to provide an intuitive way to create these angled boards by extending an existing vertical board.

## Goals / Non-Goals

**Goals:**
- Extend the `BoardTransform` schema to support arbitrary pitch.
- Update the 3D preview to correctly render tilted boards.
- Implement a "Hinge Extrude" UI action that creates a connected angled board.
- Provide a "Pitch" slider for real-time adjustment of the board's tilt.

**Non-Goals:**
- **Angled Finger Joints**: For the MVP, angled boards will simply overlap. Calculating miter or angled finger joints is out of scope.
- **Arbitrary 3D Rotation**: We are specifically adding `pitch` to a anchored system, not full 6-DOF transformation for now.
- **Physical Collision Detection**: We won't prevent boards from intersecting in 3D.

## Decisions

### 1. Schema Extension
We will add `pitch: number`, `z: number` (elevation), and `orientation: 'hinged'` to the `BoardTransform` interface.
- **Rationale**: Keeping the existing `flat` and `upright` literals preserves backward compatibility. The `z` property is necessary to anchor hinged boards to the top of walls.
- **Alternative**: Replacing `orientation` with a full Euler or Quaternion rotation was considered but rejected for being too complex for the current 2D-cut-profile-first architecture.

### 2. 3D Rendering (React Three Fiber)
In `BoardMesh`, we will apply the elevation via the group's Z-position and then apply the pitch rotation.
- **Logic**: `group.position.z = transform.z ?? 0`.
- **Rationale**: This correctly offsets the hinge point from the ground plane.

### 3. Hinge Extrude Logic
When a user clicks "Hinge Extrude" on a selected upright board:
1. Calculate the top edge world position.
2. Create a new `Board` with `orientation: 'hinged'`, `pitch: 0`.
3. The new board's `transform.x/y` will match the parent's top edge.
4. The `name` will default to "Hinged board".

## Risks / Trade-offs

- **[Risk] Visual Intersections** → Since we don't have angled joints, the 3D model will look "glitchy" at the hinge point where two boards overlap. **Mitigation**: Add a note in the UI that angled joints are coming soon.
- **[Risk] Z-Fighting** → Hinged boards might overlap exactly with other boards. **Mitigation**: Apply a tiny 0.01mm offset to the 3D mesh if needed.
