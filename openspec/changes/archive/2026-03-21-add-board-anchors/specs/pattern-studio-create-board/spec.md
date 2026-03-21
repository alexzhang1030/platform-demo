## MODIFIED Requirements

### Requirement: Committed create-board output is a valid board
The system SHALL commit a valid board object rather than a wall-like centerline object. When the committed board's anchor aligns with an existing board's anchor, the system SHALL automatically join the two boards into a board group (or extend an existing one).

#### Scenario: User finishes drawing a board
- **WHEN** the second click confirms a non-degenerate snapped span
- **THEN** the editor SHALL append a new `Board` to the current `PatternDocument`
- **THEN** the committed board SHALL have a closed outline, transform, and default thickness suitable for immediate editing
- **THEN** the committed board SHALL be aligned to the drawn 3D span using the tool's default board depth
- **THEN** the new board SHALL become the active selection

#### Scenario: Committed board anchor contacts an existing board anchor
- **WHEN** the committed board has an anchor within snap threshold of another board's anchor
- **THEN** the system SHALL merge both boards into a board group (or extend the existing group of the contacted board)
- **THEN** the resulting group SHALL become the active selection
