## ADDED Requirements

### Requirement: Editor selection state supports multiple boards
The editor SHALL maintain a shared selection set that can contain one or more boards and SHALL expose one active board for inspector-driven editing.

#### Scenario: Click a board to select it
- **WHEN** the user clicks a board in either 2D or 3D without a selection modifier
- **THEN** the editor selects only that board
- **AND** the clicked board becomes the active board

#### Scenario: Extend selection with modifier input
- **WHEN** the user modifier-clicks a board in the 2D editor
- **THEN** the editor adds or removes that board from the selected set
- **AND** the most recently clicked selected board becomes the active board

### Requirement: Selected boards can be moved directly in 2D
The editor SHALL allow users to drag selected boards in the 2D canvas and SHALL move the entire selected set by a shared delta.

#### Scenario: Drag selected board in 2D
- **WHEN** the user drags one board that is already part of the selected set in the 2D editor
- **THEN** all selected boards update their transform positions by the same delta
- **AND** the selection set remains unchanged

#### Scenario: Drag unselected board in 2D
- **WHEN** the user starts dragging a board that is not in the selected set in the 2D editor
- **THEN** the editor first collapses selection to that board
- **AND** the drag moves that board as the new selected set

### Requirement: Selected boards can be moved directly in 3D
The editor SHALL allow users to drag selected boards in the 3D workspace on the shared work plane and SHALL keep the 2D inspector state synchronized.

#### Scenario: Drag selected board in 3D
- **WHEN** the user drags a selected board in the 3D workspace
- **THEN** all selected boards move together on the board layout plane
- **AND** the 2D editor and inspector reflect the updated transforms without a separate refresh

### Requirement: Direct-edit gestures take precedence over navigation
The editor MUST resolve interaction conflicts so direct editing gestures win over viewport navigation when both could start from the same pointer sequence.

#### Scenario: Control-point drag blocks board move
- **WHEN** the user starts dragging a visible outline control point in the 2D editor
- **THEN** the editor updates the point position
- **AND** board movement and viewport pan do not start

#### Scenario: Board move blocks orbit or pan
- **WHEN** the user starts dragging a selected board in either workspace
- **THEN** the editor moves the board set
- **AND** the viewport navigation gesture does not start until the pointer sequence ends
