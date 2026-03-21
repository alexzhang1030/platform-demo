## Context

Currently, users must manually extrude and tilt boards to create a roof. The "Auto Gable Roof" tool automates this by analyzing an existing enclosure and generating the necessary roof structure in one step.

## Goals / Non-Goals

**Goals:**
- Identify the best candidate walls for a roof within a board group.
- Calculate the roof panel length and pitch so they meet at a center peak.
- Generate two `hinged` boards with correct elevation and grouping.

**Non-Goals:**
- **Non-Orthogonal Roofs**: We will only support roofs for groups with axis-aligned parallel walls (0° or 90°).
- **Hip Roofs**: Only standard two-panel gable roofs are supported for now.
- **Complex Intersections**: Roof panels will overlap at the peak.

## Decisions

### 1. Parallel Wall Detection
We will iterate through all boards in the selected group:
- Group them by rotation (0° vs 90°).
- For each rotation group, find the pair with the largest distance between their transforms.
- Rationale: The largest span typically represents the main enclosure footprint.

### 2. Geometry Calculation (Trigonometry)
For a given `Span` (distance between walls) and a fixed `Pitch` (default 45°):
- `RoofPanelWidth = (Span / 2) / cos(Pitch)`.
- The panels will be anchored at the top of the walls (`z = wallHeight`).
- One panel will have `flipPitch = true` to point inward.

### 3. Implementation Helper
A new `addGableRoofToGroup` function will be added to `apps/web/src/lib/pattern-studio.ts`.
- It will return a partial `PatternDocument` update containing the new boards and the updated group.

## Risks / Trade-offs

- **[Risk] Incorrect Wall Selection** → In complex groups, the algorithm might pick the wrong parallel pair. **Mitigation**: Start with a simple "longest pair" heuristic and allow the user to Undo.
- **[Risk] Z-fighting at the Peak** → The two roof panels will overlap exactly at the top. **Mitigation**: Not a priority for MVP, can be solved later with miter joints.
