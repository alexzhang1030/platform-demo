## MODIFIED Requirements

### Requirement: Boxel mode renders assembly-level feedback
The system SHALL present boxel content and selection as assembly-level feedback in the 3D editor. Pointer interactions on an assembly initiate both selection and drag.

#### Scenario: User selects a connected boxel assembly
- **WHEN** the user clicks or creates a boxel assembly
- **THEN** the editor SHALL treat the full assembly as the selected object
- **THEN** the viewport SHALL render the assembly as cubes derived from the assembly cells

#### Scenario: User initiates a drag on an assembly
- **WHEN** the user presses the pointer on an assembly mesh and moves it
- **THEN** the editor SHALL start a drag on that assembly
- **THEN** the assembly SHALL move with the pointer in real time
