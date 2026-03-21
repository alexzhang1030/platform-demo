## Why

Creating a roof for a box currently requires manual extrusion and pitch adjustment for multiple boards. This process is repetitive and error-prone. An "Auto Gable Roof" feature will allow users to generate a complete roof with a single click, automatically calculating the necessary dimensions and angles to ensure the panels meet perfectly at the peak.

## What Changes

- **Add Gable Roof Action**: A new button in the Board Group Inspector to automatically generate a roof for rectangular enclosures.
- **Parallel Wall Detection**: Logic to identify the appropriate parallel walls within a group to support the roof.
- **Auto-Calculated Geometry**: Automatically determine the pitch and length of the roof panels based on the span between walls.
- **Hinged Board Generation**: Create two new boards with the `hinged` orientation and correct `z` elevation.

## Capabilities

### New Capabilities
- `board-auto-roof`: Allows one-click generation of gable roofs for enclosures by calculating and placing angled hinged boards.

### Modified Capabilities
None.

## Impact

- `apps/web/src/lib/pattern-studio.ts`: New `addGableRoofToGroup` logic.
- `apps/web/src/components/pattern-studio/editor-page.tsx`: New UI action in the inspector for board groups.
