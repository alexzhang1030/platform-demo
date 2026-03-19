## ADDED Requirements

### Requirement: Editor presents a 2D nesting layout for laser cutting
The system SHALL present the 2D panel in the pattern studio editor as a laser-cutter-oriented nesting layout instead of an editable board canvas.

#### Scenario: User opens the 2D panel
- **WHEN** the editor route shows the 2D workspace in standalone or split mode
- **THEN** the 2D surface SHALL render arranged board outputs for cutting
- **THEN** the 2D surface SHALL not expose direct board drag, point drag, or create-board editing gestures

### Requirement: Nesting layout is derived from automatic packing
The system SHALL arrange boards in the 2D panel through an automatic packing algorithm rather than manual free placement.

#### Scenario: User has multiple boards in the document
- **WHEN** the 2D nesting view is rendered
- **THEN** the system SHALL compute derived placements for the current boards using a packing algorithm
- **THEN** the rendered 2D arrangement SHALL reflect those computed placements instead of the boards' edit-space transforms

### Requirement: Nesting computation is shared and render-agnostic
The system SHALL implement nesting computation in a shared render-agnostic core layer so the same packing logic can be reused by editor and generator workflows.

#### Scenario: Multiple app surfaces need nesting results
- **WHEN** editor or generator code needs derived board packing data
- **THEN** the packing computation SHALL be provided by shared core logic rather than app-local rendering code
- **THEN** the consuming app layer SHALL only adapt the shared result for presentation

### Requirement: Nesting layout supports rectangular board packing
The system SHALL produce a deterministic rectangular packing result suitable for a first-pass laser cutting layout.

#### Scenario: User has boards with different sizes
- **WHEN** the packing algorithm runs for the current document
- **THEN** each board SHALL be represented by a packable footprint derived from its board geometry
- **THEN** the system SHALL place those footprints into one or more sheet layouts without overlapping placements

### Requirement: 2D nesting output remains tied to the current design document
The system SHALL update the nesting layout when the current board set changes, without mutating the main document transforms to match packed output positions.

#### Scenario: User changes the document in 3D
- **WHEN** boards are added, removed, or resized in the editor
- **THEN** the 2D nesting layout SHALL recompute from the updated board set
- **THEN** the packed layout SHALL remain a derived manufacturing view rather than changing the original board transforms
