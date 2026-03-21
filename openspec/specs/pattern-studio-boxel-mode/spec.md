# pattern-studio-boxel-mode Specification

## Purpose
Define the voxel-based `boxel-mode` authoring flow in the pattern studio editor.

## Requirements
### Requirement: Editor provides a boxel creation mode
The system SHALL provide a `boxel-mode` tool in the pattern studio editor for voxel-based creation and connectivity-aware editing.

#### Scenario: User activates boxel mode
- **WHEN** the user switches the editor to `boxel-mode`
- **THEN** the editor SHALL route create clicks to the boxel workflow instead of the board workflow
- **THEN** the workspace SHALL be ready to place boxels using ground-plane clicks

### Requirement: Boxel mode creates a new assembly from a ground-plane click
The system SHALL create a new boxel assembly when the user clicks a snapped ground-plane location in `boxel-mode` and the new boxel does not face-connect to any existing assembly.

#### Scenario: User places the first isolated boxel
- **WHEN** the user clicks a snapped ground-plane location whose new boxel would not be face-connected to any existing assembly
- **THEN** the editor SHALL create a new `BoxelAssembly`
- **THEN** the new assembly SHALL contain exactly one boxel resting on the floor plane at that snapped location
- **THEN** the new assembly SHALL become the active selection

### Requirement: Boxel mode merges face-connected assemblies
The system SHALL treat X-axis and Y-axis face-to-face boxel contact as one connected structure.

#### Scenario: User adds a neighboring boxel
- **WHEN** the user adds a new boxel whose face touches an existing assembly along the X or Y axis
- **THEN** the editor SHALL add that boxel into the connected assembly instead of creating a separate isolated assembly

#### Scenario: One new boxel bridges multiple assemblies
- **WHEN** the user adds a new boxel whose faces touch boxels from multiple existing assemblies
- **THEN** the editor SHALL merge the touched assemblies and the new boxel into one resulting assembly
- **THEN** the merged result SHALL be selected as one object

### Requirement: Boxel mode supports single-boxel removal
The system SHALL allow the user to remove one boxel from an existing assembly.

#### Scenario: User removes one boxel
- **WHEN** the user targets one boxel inside an existing assembly for removal
- **THEN** the editor SHALL remove only that boxel cell from the assembly data
- **THEN** the remaining structure SHALL be re-evaluated using the assembly connectivity rules

### Requirement: Boxel mode splits disconnected remnants after removal
The system SHALL split a boxel assembly into separate assemblies when removing one boxel disconnects the remaining structure.

#### Scenario: Removed boxel was the bridge
- **WHEN** one removed boxel causes the remaining cells to form multiple disconnected face-connected groups
- **THEN** the editor SHALL replace the original assembly with one assembly per remaining connected group
- **THEN** each resulting assembly SHALL remain a valid boxel entity in the document

### Requirement: Boxel mode uses uniform snapped placement
The system SHALL snap boxel placement to the workspace grid and place only uniform-size cells in the first version.

#### Scenario: User previews a placement
- **WHEN** the cursor moves in `boxel-mode`
- **THEN** the editor SHALL resolve the hovered boxel location from a snapped ground-plane position
- **THEN** any placement preview SHALL use the assembly cell size without stretching or non-uniform scaling

### Requirement: Boxel mode renders assembly-level feedback
The system SHALL present boxel content and selection as assembly-level feedback in the 3D editor.

#### Scenario: User selects a connected boxel assembly
- **WHEN** the user clicks or creates a boxel assembly
- **THEN** the editor SHALL treat the full assembly as the selected object
- **THEN** the viewport SHALL render the assembly as cubes derived from the assembly cells
