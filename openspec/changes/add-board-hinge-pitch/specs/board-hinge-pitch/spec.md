## ADDED Requirements

### Requirement: Board Hinge Pitch Transform
The `BoardTransform` SHALL include a `pitch` property that defines the rotation of the board around its anchor axis (X or Y, depending on orientation).
- A `pitch` of 0 degrees SHALL correspond to a 'flat' board.
- A `pitch` of 90 degrees SHALL correspond to an 'upright' board.
- The system SHALL support any numeric `pitch` value (0-360 degrees).

#### Scenario: Rendering a hinged board
- **WHEN** a board has a `pitch` of 45 degrees
- **THEN** the 3D preview SHALL render the board at a 45-degree angle relative to its anchor point

### Requirement: Hinge Extrude Action
The system SHALL provide a "Hinge Extrude" action for 'upright' boards.
- The action SHALL create a new board anchored to the top edge of the selected board.
- The new board SHALL initially have a `pitch` of 0 degrees (horizontal).
- The width of the new board SHALL match the width of the parent board's top edge.

#### Scenario: User clicks Hinge Extrude
- **WHEN** user selects an upright board and clicks "Hinge Extrude"
- **THEN** a new horizontal board is created and connected to the parent's top edge

### Requirement: Pitch Control UI
The Board Editor SHALL include a "Pitch" slider when a board is in 'hinged' mode.
- The slider SHALL allow adjusting the `pitch` between 0 and 180 degrees.
- Changes to the slider SHALL immediately update the board's 3D rotation in the preview.

#### Scenario: Adjusting pitch via slider
- **WHEN** user moves the "Pitch" slider to 60 degrees
- **THEN** the selected board's `pitch` is updated to 60 and the 3D model tilts accordingly
