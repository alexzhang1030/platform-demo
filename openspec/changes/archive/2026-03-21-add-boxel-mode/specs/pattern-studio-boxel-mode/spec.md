## ADDED Requirements

### Requirement: Editor provides a boxel creation mode
The system SHALL provide a `boxel-mode` tool in the pattern studio editor for voxel-based creation.

#### Scenario: User activates boxel mode
- **WHEN** the user switches the editor to `boxel-mode`
- **THEN** the editor SHALL route create clicks to the boxel workflow instead of the board workflow
- **THEN** the workspace SHALL be ready to place boxels using ground-plane clicks

### Requirement: Boxel mode creates a new assembly from a ground-plane click
The system SHALL create a new boxel assembly when the user clicks an empty ground-plane location in `boxel-mode`.

#### Scenario: User places the first boxel
- **WHEN** the user clicks a snapped ground-plane location that does not target an existing assembly column
- **THEN** the editor SHALL create a new `BoxelAssembly`
- **THEN** the new assembly SHALL contain exactly one boxel resting on the floor plane at that snapped column
- **THEN** the new assembly SHALL become the active selection

### Requirement: Boxel mode stacks upward within the current column
The system SHALL stack boxels vertically when the user clicks again on the same assembly column in `boxel-mode`.

#### Scenario: User extends an existing stack
- **WHEN** the active `boxel-mode` target is an existing assembly column and the user confirms another create click on that column
- **THEN** the editor SHALL append one new occupied cell above the highest existing cell in that column
- **THEN** the updated assembly SHALL remain selected as one object

### Requirement: Boxel mode uses uniform snapped placement
The system SHALL snap boxel placement to the workspace grid and place only uniform-size cells in the first version.

#### Scenario: User previews a placement
- **WHEN** the cursor moves in `boxel-mode`
- **THEN** the editor SHALL resolve the hovered column from a snapped ground-plane position
- **THEN** any placement preview SHALL use the assembly cell size without stretching or non-uniform scaling

### Requirement: Boxel mode renders assembly-level feedback
The system SHALL present boxel content and selection as assembly-level feedback in the 3D editor.

#### Scenario: User selects a boxel assembly
- **WHEN** the user clicks or creates a boxel assembly
- **THEN** the editor SHALL treat the full assembly as the selected object
- **THEN** the viewport SHALL render the assembly as stacked cubes derived from the assembly cells

### Requirement: Boxel mode first release is vertically scoped
The system SHALL limit the first release of boxel authoring to vertical stacking behavior.

#### Scenario: User attempts lateral expansion
- **WHEN** the user is in the first release of `boxel-mode`
- **THEN** the supported create behavior SHALL be creating a new snapped column or stacking upward on the current column
- **THEN** the system SHALL NOT require horizontal painting or multi-column assembly editing
