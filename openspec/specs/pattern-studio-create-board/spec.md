# pattern-studio-create-board Specification

## Purpose
TBD - created by archiving change add-create-board-tool. Update Purpose after archive.
## Requirements
### Requirement: Editor supports interactive 3D board creation
The system SHALL provide a create-board tool in the pattern studio editor that creates a new board through a two-click flow in the 3D workspace.

#### Scenario: User creates a board with two clicks in 3D
- **WHEN** the user activates the create-board tool and clicks once on the 3D workspace ground plane
- **THEN** the editor SHALL enter a drawing state with the first point fixed
- **THEN** the next confirming click SHALL commit a new board into the current document

### Requirement: Create-board tool uses snapped 3D placement
The system SHALL snap board creation to the 3D workspace grid and apply 45-degree direction snapping by default while drawing.

#### Scenario: User moves the cursor while drawing in 3D
- **WHEN** the create-board tool is in its drawing state
- **THEN** the live endpoint SHALL snap to the workspace grid
- **THEN** the drawn direction SHALL snap to the nearest 45-degree increment by default

#### Scenario: User disables angle snapping
- **WHEN** the user holds Shift while drawing a board
- **THEN** the endpoint SHALL continue to snap to the workspace grid
- **THEN** 45-degree angle snapping SHALL be temporarily disabled

### Requirement: Create-board tool shows a live 3D preview and supports cancel
The system SHALL render an in-progress 3D board preview during drawing and allow the user to cancel the create action before commit.

#### Scenario: User previews a board before commit
- **WHEN** the create-board tool is active in the 3D viewport
- **THEN** the editor SHALL render a visible cursor marker at the snapped point on the ground plane
- **THEN** if the tool is in its drawing state and the cursor moves, the editor SHALL render a temporary board preview that reflects the snapped start/end points

#### Scenario: User cancels the tool
- **WHEN** the create-board tool is in its drawing state and the user triggers cancel
- **THEN** the temporary preview SHALL disappear
- **THEN** no new board SHALL be committed

### Requirement: Committed create-board output is a valid board
The system SHALL commit a valid board object rather than a wall-like centerline object.

#### Scenario: User finishes drawing a board
- **WHEN** the second click confirms a non-degenerate snapped span
- **THEN** the editor SHALL append a new `Board` to the current `PatternDocument`
- **THEN** the committed board SHALL have a closed outline, transform, and default thickness suitable for immediate editing
- **THEN** the committed board SHALL be aligned to the drawn 3D span using the tool's default board depth
- **THEN** the new board SHALL become the active selection

### Requirement: Create-board tool does not conflict with normal 3D interaction
The system SHALL prevent normal board drag/selection from stealing left-click create gestures while create mode is active.

#### Scenario: User clicks over existing geometry while create mode is active
- **WHEN** the create-board tool is active and the cursor is over an existing board
- **THEN** the tool SHALL still resolve the snapped point on the ground plane
- **THEN** the click SHALL drive create-board state instead of normal board dragging

### Requirement: Create-board can create an upright board
The system SHALL create a single upright board from one 3D create gesture.

#### Scenario: User creates a standing board
- **WHEN** the user activates the 3D create-board tool and confirms a non-degenerate span
- **THEN** the tool SHALL append one `Board` object to the document
- **THEN** the board transform SHALL mark the board as upright
- **THEN** the board outline SHALL represent the board's cut profile, not a flat floor footprint

### Requirement: Create-board can snap to an existing upright board
The system SHALL allow the 3D create-board tool to snap to existing upright boards.

#### Scenario: Start or end point is near an upright board
- **WHEN** the create cursor is within snap range of an existing upright board baseline
- **THEN** the cursor SHALL snap to the closest valid connection point on that board
- **THEN** preview and commit SHALL use that snapped point consistently

### Requirement: Snapped connections generate dovetail geometry
The system SHALL write a dovetail-style connection into the board geometry when create-board snaps to an existing upright board.

#### Scenario: User commits a snapped board
- **WHEN** the user confirms a create span whose start or end snaps to an existing upright board
- **THEN** the new board outline SHALL include a dovetail tab on the snapped side
- **THEN** the existing upright board SHALL gain a matching dovetail socket hole at the snapped location
- **THEN** the resulting geometry SHALL be valid for both 3D preview and 2D nesting output
