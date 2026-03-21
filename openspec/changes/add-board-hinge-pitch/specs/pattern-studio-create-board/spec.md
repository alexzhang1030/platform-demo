## MODIFIED Requirements

### Requirement: Committed create-board output is a valid board
The system SHALL commit a valid board object rather than a wall-like centerline object.
- The committed board SHALL have a closed outline, transform, and default thickness suitable for immediate editing.
- The committed board transform SHALL support 'flat', 'upright', and 'hinged' orientations.
- If the orientation is 'hinged', the transform SHALL include a `pitch` value.

#### Scenario: User finishes drawing a board
- **WHEN** the second click confirms a non-degenerate snapped span
- **THEN** the editor SHALL append a new `Board` to the current `PatternDocument`
- **THEN** the committed board SHALL have a closed outline, transform, and default thickness suitable for immediate editing
- **THEN** the committed board SHALL be aligned to the drawn 3D span using the tool's default board depth
- **THEN** the new board SHALL become the active selection
- **THEN** if the committed board's anchor contacts an existing board's anchor, the new board SHALL join the same board group as that existing board
