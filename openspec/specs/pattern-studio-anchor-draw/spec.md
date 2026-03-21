# pattern-studio-anchor-draw Specification

## Purpose
Defines the behavior for activating the draw-board tool by clicking a board anchor dot in the 3D viewport, including how the draft start point is seeded from the anchor's world position and how the editor returns to select mode after completion.

## Requirements

### Requirement: Clicking a board anchor activates the draw-board tool from that position
The system SHALL enter draw-board mode and pre-seed the draft start point when the user clicks an anchor dot on a selected board in the 3D viewport.

#### Scenario: User clicks an anchor on a selected board
- **WHEN** the user clicks an anchor dot on a board that is currently selected
- **THEN** the editor SHALL activate the draw-board tool
- **THEN** the draw-board draft start point SHALL be set to the anchor's world XY position
- **THEN** the toolbar SHALL reflect the active draw-board state

#### Scenario: Anchor click is ignored when create mode is already active
- **WHEN** the draw-board tool or another create mode is already active
- **THEN** clicking an anchor dot SHALL NOT re-seed the draft start point
- **THEN** the normal ground-plane click handler SHALL take precedence

#### Scenario: Completing the draft from an anchor returns to select mode
- **WHEN** the user completes or cancels the board draw that was started from an anchor click
- **THEN** the editor SHALL deactivate the locally-initiated draw-board mode
- **THEN** the toolbar SHALL return to the select state if no other tool was explicitly activated
