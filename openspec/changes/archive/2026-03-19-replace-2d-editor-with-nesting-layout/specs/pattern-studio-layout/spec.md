## MODIFIED Requirements

### Requirement: Editor uses overlay support panels
The system SHALL render the editor with the 3D board workspace as the dominant interactive surface, while board lists, inspectors, mode controls, export actions, and the 2D nesting output are presented as overlays, floating bars, or inset panels.

#### Scenario: User edits boards
- **WHEN** the editor route is visible
- **THEN** the 3D workspace SHALL remain the primary interactive surface for editing boards
- **THEN** the 2D panel SHALL behave as a nesting/output view rather than a second editing canvas
- **THEN** secondary controls SHALL remain grouped into overlays that can coexist with the workspace
- **THEN** existing editor operations such as selecting boards, creating boards, changing workspace mode, and exporting remain available
