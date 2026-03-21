# board-group Specification

## Purpose
Defines the rules for grouping boards together, including group creation, merging, splitting, and unified selection behavior.

## Requirements

### Requirement: Boards can be grouped together
The system SHALL support grouping two or more boards into a named board group within the document.

#### Scenario: User creates a board group
- **WHEN** two or more boards are selected and a group creation action is triggered
- **THEN** the system SHALL create a new board group containing those boards
- **THEN** each grouped board SHALL be associated with the new group

### Requirement: Board groups can be merged
The system SHALL allow two or more board groups to be merged into a single board group.

#### Scenario: User merges two board groups
- **WHEN** two or more board groups are selected and a merge action is triggered
- **THEN** the system SHALL produce a single board group containing all boards from the source groups
- **THEN** the source groups SHALL no longer exist as separate groups after the merge

### Requirement: Board groups can be split
The system SHALL allow a board group to be split, separating one or more boards out of the group.

#### Scenario: User splits a board out of a group
- **WHEN** a board within a group is selected for split and a split action is triggered
- **THEN** the system SHALL remove that board from the existing group
- **THEN** if the remaining group contains fewer than two boards, the group SHALL be dissolved

### Requirement: Board group selection is unified
Selecting any board within a group SHALL extend selection to all boards in that group.

#### Scenario: User selects a board that belongs to a group
- **WHEN** the user selects a single board that is a member of a board group
- **THEN** the system SHALL select all boards belonging to that group
- **THEN** the selection state SHALL reflect the full group membership

### Requirement: Board group connections produce finger joint geometry for 3D rendering
When boards within a group are connected, the system SHALL apply `getBoardOutlineWithJoints` to derive finger joint geometry used in the 3D preview render.

#### Scenario: 3D preview renders a connected board group
- **WHEN** a board group contains two or more connected boards
- **THEN** the 3D render pipeline SHALL call `getBoardOutlineWithJoints` for each board in the group
- **THEN** the resulting outlines with finger joint tabs SHALL be used as the geometry source for the 3D board meshes

### Requirement: Board group connections produce finger joint geometry for 2D nesting output
When boards within a group are connected, the system SHALL apply `getBoardOutlineWithJoints` to derive finger joint geometry used in the 2D nesting layout output.

#### Scenario: 2D nesting layout is generated for a connected board group
- **WHEN** a board group with active connections is included in the 2D nesting output
- **THEN** the nesting pipeline SHALL call `getBoardOutlineWithJoints` for each board in the group
- **THEN** the resulting outlines with finger joint tabs SHALL be used as the shapes placed in the nesting layout
