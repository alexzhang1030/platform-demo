## ADDED Requirements

### Requirement: Board group connections produce finger joint geometry for rendering and export
The system SHALL apply finger joint geometry derived from `BoardGroup.connections` when a board's outline is needed for 3D rendering or 2D nesting output.

#### Scenario: Board is rendered in the 3D viewport with an active connection
- **WHEN** the 3D viewport renders an upright board that belongs to a board group with at least one connection
- **THEN** the board's mesh SHALL use the finger-joint-modified outline from `getBoardOutlineWithJoints`
- **THEN** interlocking tabs and slots SHALL be visually present at each connected anchor edge

#### Scenario: Board outline is requested for nesting with active connections
- **WHEN** the nesting pipeline requests a board's outline and that board has active connections in a board group
- **THEN** the pipeline SHALL receive the finger-joint-modified outline
- **THEN** the stored `Board.outline` SHALL remain unchanged after nesting computation
