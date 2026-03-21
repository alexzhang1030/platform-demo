## ADDED Requirements

### Requirement: Finger joint geometry is derivable from a board connection
The system SHALL derive finger joint (box joint) outline modifications for two connected upright boards without mutating the stored `Board.outline`.

#### Scenario: Compute finger joint outlines for a connection
- **WHEN** `getBoardOutlineWithJoints` is called for a board that participates in one or more connections
- **THEN** the system SHALL return a modified `Path2DShape` with alternating tab and slot teeth at each connected anchor edge
- **THEN** the returned outline SHALL NOT be written back to `Board.outline`
- **THEN** the stored `Board.outline` SHALL remain unchanged

### Requirement: L-joint connections produce interlocking corner tabs
The system SHALL generate interlocking finger tabs on both boards when the angle between them is approximately 90°.

#### Scenario: Two boards meet at a right angle (L-joint)
- **WHEN** two upright boards are connected via anchor endpoints and the angle between their baselines is between 30° and 150°
- **THEN** the system SHALL classify the connection as an L-joint
- **THEN** board A (the `a` endpoint) SHALL receive tabs at odd finger positions along its connecting edge
- **THEN** board B (the `b` endpoint) SHALL receive complementary tabs at even finger positions
- **THEN** the tab depth on each board SHALL equal the other board's `thickness`

### Requirement: Straight connections produce interlocking inline tabs
The system SHALL generate interlocking inline tabs when two boards are colinear (angle ≤ 30° or ≥ 150°).

#### Scenario: Two boards are aligned end-to-end (straight joint)
- **WHEN** two upright boards are connected via anchor endpoints and the angle between their baselines is less than 30° or greater than 150°
- **THEN** the system SHALL classify the connection as a straight joint
- **THEN** both boards SHALL receive interlocking tab and slot patterns at the connecting end face
- **THEN** the tab depth SHALL be capped at `min(thickness, length × 0.25)` to preserve structural integrity

### Requirement: Finger count is derived from board height and thickness
The system SHALL compute finger count automatically so tabs are proportional to the board dimensions.

#### Scenario: Finger count calculation
- **WHEN** computing finger joint geometry for a board
- **THEN** the system SHALL compute `fingerCount = clamp(round(height / (2 × thickness)), 3, 15)`
- **THEN** the finger count SHALL be odd so both ends of the joint edge start and end with a tab
- **THEN** `fingerWidth = height / fingerCount`

### Requirement: Unrecognised connection angles produce no joint geometry
The system SHALL leave boards unmodified when the connection angle does not match a supported joint type.

#### Scenario: Connection at an unsupported angle
- **WHEN** the angle between two connected boards does not fall within the L-joint or straight-joint classification ranges
- **THEN** the system SHALL return the board's original outline unchanged
- **THEN** no tabs or slots SHALL be added to either board
