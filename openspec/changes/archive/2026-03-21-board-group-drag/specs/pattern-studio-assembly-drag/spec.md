## ADDED Requirements

### Requirement: Boxel assemblies support drag-to-move in the 3D viewport
The system SHALL allow the user to drag any boxel assembly mesh to reposition the entire assembly within the 3D workspace.

#### Scenario: User drags an assembly
- **WHEN** the user presses and moves the pointer over a boxel assembly mesh
- **THEN** the assembly SHALL translate in the ground plane following the pointer
- **THEN** all cells of the assembly SHALL move together, preserving their relative positions
- **THEN** the document SHALL reflect the updated assembly origin on each frame

#### Scenario: User releases after dragging an assembly
- **WHEN** the user releases the pointer after dragging an assembly
- **THEN** the assembly's final position SHALL be committed to the document
- **THEN** the assembly SHALL remain selected after the drag

#### Scenario: Camera-pan modifier suppresses assembly drag
- **WHEN** the camera-pan modifier key is held while the user presses on an assembly
- **THEN** the drag SHALL NOT start
- **THEN** the camera-pan behavior SHALL proceed normally

### Requirement: Short press on assembly without movement is treated as selection only
The system SHALL distinguish between a drag gesture and a tap-select gesture on an assembly.

#### Scenario: User taps an assembly without moving
- **WHEN** the user presses and releases on an assembly mesh without moving the pointer
- **THEN** the assembly SHALL be selected
- **THEN** no positional change SHALL be committed to the document
