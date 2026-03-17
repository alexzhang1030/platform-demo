## ADDED Requirements

### Requirement: Studio shell prioritizes the workspace surface
The system SHALL render the pattern studio routes inside a shell where the main workspace surface occupies the full available viewport and top-level chrome floats above or around it without reducing the usable canvas more than necessary.

#### Scenario: User opens a studio route
- **WHEN** the editor or generator route is rendered
- **THEN** the main workspace surface fills the remaining viewport height
- **THEN** global route navigation and theme controls remain accessible as shell chrome
- **THEN** the shell does not present the route as a conventional padded content page

### Requirement: Editor uses overlay support panels
The system SHALL render the editor with the 2D/3D board workspace as the dominant surface, while board lists, inspectors, mode controls, and export actions are presented as overlay side panels, floating bars, or inset cards.

#### Scenario: User edits boards
- **WHEN** the editor route is visible
- **THEN** the board workspace remains the primary visual surface
- **THEN** secondary controls are grouped into overlays that can coexist with the workspace
- **THEN** existing editor operations such as selecting boards, adjusting points, changing workspace mode, and exporting remain available

### Requirement: Generator follows the same canvas-first layout model
The system SHALL render the generator with the SVG preview as the dominant surface and treat import, parse status, JSON source, and export actions as supporting overlays instead of permanent split columns.

#### Scenario: User opens the generator
- **WHEN** the generator route is rendered
- **THEN** the SVG preview occupies the primary visual area
- **THEN** import/export controls and diagnostic panels remain accessible through overlay layout regions
- **THEN** the route feels structurally consistent with the editor shell

### Requirement: Layout refactor preserves existing route behavior
The system SHALL preserve the current editor and generator feature set while the layout is refactored.

#### Scenario: Existing workflow is used after the layout change
- **WHEN** a user imports JSON, edits boards, switches between editor and generator, or exports output
- **THEN** those actions continue to work without requiring new route structure or data model changes
- **THEN** the refactor only changes presentation structure and control placement, not document semantics
