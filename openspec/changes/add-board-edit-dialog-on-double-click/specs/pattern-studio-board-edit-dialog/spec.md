## ADDED Requirements

### Requirement: Boards can open a focused edit dialog from direct workspace interaction
The editor SHALL open a board edit dialog when the user double-clicks a board in either the 2D board surface or the 3D board workspace.

#### Scenario: Double-click board in 2D
- **WHEN** the user double-clicks a board shape in the 2D workspace
- **THEN** the editor SHALL select that board as the active board
- **AND** the editor SHALL open a dialog for editing that board

#### Scenario: Double-click board in 3D
- **WHEN** the user double-clicks a board mesh in the 3D workspace
- **THEN** the editor SHALL select that board as the active board
- **AND** the editor SHALL open a dialog for editing that board

### Requirement: Edit dialog reuses board editing behavior
The board edit dialog SHALL expose the same single-board editing fields and update behavior as the normal board inspector.

#### Scenario: Edit board in dialog
- **WHEN** the user changes a board property inside the dialog
- **THEN** the active board in the current document SHALL update immediately
- **AND** the 2D and 3D editor views SHALL reflect the change without requiring dialog close or manual refresh

### Requirement: Double-click edit respects other board interactions
The editor MUST prevent the board edit dialog from opening when the pointer sequence has already resolved into a conflicting interaction such as drag, create-board, or camera/navigation input.

#### Scenario: Drag does not open dialog
- **WHEN** the user starts moving a board through a drag gesture in 3D
- **THEN** the editor SHALL move the board normally
- **AND** the edit dialog SHALL remain closed for that pointer sequence

#### Scenario: Create-board mode blocks edit-open
- **WHEN** the create-board tool is active and the user clicks in the 3D workspace over existing geometry
- **THEN** the create-board interaction SHALL keep priority
- **AND** the board edit dialog SHALL not open

#### Scenario: Camera modifier blocks edit-open
- **WHEN** the user performs a board-targeted pointer sequence while the camera pan or navigation modifier is active
- **THEN** viewport navigation SHALL keep priority
- **AND** the board edit dialog SHALL not open
