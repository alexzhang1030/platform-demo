# board-finger-joint Specification

## Purpose
Defines the rules for deriving finger joint geometry from board connections, producing interlocking tab outlines for L-joints (corner connections at ~90°) and straight joints (inline connections at ~0°/180°).

## Requirements

### Requirement: Finger joint geometry is derivable from board connections
The system SHALL expose a function `getBoardOutlineWithJoints` that accepts a board and its active connections and returns a modified 2D outline with finger joint tabs cut or added along each connected edge.

#### Scenario: Board outline with joints is requested
- **WHEN** `getBoardOutlineWithJoints` is called with a board and a set of connections
- **THEN** the system SHALL return a 2D outline polygon that incorporates finger joint geometry for each connected edge
- **THEN** edges with no active connection SHALL be returned unchanged

### Requirement: L-joint geometry is produced for connections at ~90°
When two boards meet at an angle close to 90°, the system SHALL produce L-joint interlocking corner tab geometry along the connected edges.

#### Scenario: Connection angle is approximately 90 degrees
- **WHEN** the angle between two connected boards is within the L-joint angular tolerance of 90°
- **THEN** the system SHALL compute interlocking corner tabs along the shared edge
- **THEN** the tabs on board A SHALL interlock with the corresponding slots on board B

### Requirement: Straight joint geometry is produced for connections at ~0° or ~180°
When two boards meet at an angle close to 0° or 180°, the system SHALL produce straight joint inline tab geometry along the connected edges.

#### Scenario: Connection angle is approximately 0 or 180 degrees
- **WHEN** the angle between two connected boards is within the straight-joint angular tolerance of 0° or 180°
- **THEN** the system SHALL compute inline interlocking tabs along the shared edge
- **THEN** the tabs on board A SHALL interlock with the corresponding slots on board B

### Requirement: Finger count follows an odd-count formula clamped to [3, 15]
The number of fingers along a joint edge SHALL be derived from the edge length and material thickness, rounded to the nearest odd integer, and clamped to the inclusive range [3, 15].

#### Scenario: Computed finger count is even
- **WHEN** the raw finger count formula yields an even number
- **THEN** the system SHALL round it to the nearest odd integer before clamping

#### Scenario: Computed finger count falls below the minimum
- **WHEN** the rounded odd finger count is less than 3
- **THEN** the system SHALL clamp the count to 3

#### Scenario: Computed finger count exceeds the maximum
- **WHEN** the rounded odd finger count is greater than 15
- **THEN** the system SHALL clamp the count to 15

### Requirement: Unsupported connection angles return the original outline unchanged
For connection angles that are neither ~90° nor ~0°/180°, the system SHALL return the board's original outline without modification.

#### Scenario: Connection angle is not supported
- **WHEN** `getBoardOutlineWithJoints` encounters a connection whose angle does not fall within any supported joint tolerance
- **THEN** the system SHALL leave the corresponding edge unchanged in the returned outline
- **THEN** no error SHALL be raised for that edge
