## MODIFIED Requirements

### Requirement: Editor uses overlay support panels
The system SHALL render the editor with the 2D/3D board workspace as the dominant surface, while board lists, inspectors, mode controls, and export actions are presented as overlay side panels, floating bars, inset cards, or focused dialogs.

#### Scenario: User edits boards
- **WHEN** the editor route is visible
- **THEN** the board workspace remains the primary visual surface
- **THEN** secondary controls are grouped into overlays or dialogs that can coexist with the workspace
- **THEN** existing editor operations such as selecting boards, adjusting points, changing workspace mode, and exporting remain available

#### Scenario: Focused board editing opens in a dialog
- **WHEN** the user opens board editing from a direct board interaction
- **THEN** the editor MAY present the board inspector content inside a dialog without leaving the current route
- **THEN** closing the dialog SHALL return the user to the same workspace context
