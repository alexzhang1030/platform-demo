## ADDED Requirements

### Requirement: Create-board can create an upright board
The system SHALL create a single upright board from one 3D create gesture.

#### Scenario: User creates a standing board
- **WHEN** the user activates the 3D create-board tool and confirms a non-degenerate span
- **THEN** the tool SHALL append one `Board` object to the document
- **THEN** the board transform SHALL mark the board as upright
- **THEN** the board outline SHALL represent the board's cut profile, not a flat floor footprint

### Requirement: Create-board can snap to an existing upright board
The system SHALL allow the 3D create-board tool to snap to existing upright boards.

#### Scenario: Start or end point is near an upright board
- **WHEN** the create cursor is within snap range of an existing upright board baseline
- **THEN** the cursor SHALL snap to the closest valid connection point on that board
- **THEN** preview and commit SHALL use that snapped point consistently

### Requirement: Snapped connections generate dovetail geometry
The system SHALL write a dovetail-style connection into the board geometry when create-board snaps to an existing upright board.

#### Scenario: User commits a snapped board
- **WHEN** the user confirms a create span whose start or end snaps to an existing upright board
- **THEN** the new board outline SHALL include a dovetail tab on the snapped side
- **THEN** the existing upright board SHALL gain a matching dovetail socket hole at the snapped location
- **THEN** the resulting geometry SHALL be valid for both 3D preview and 2D nesting output
