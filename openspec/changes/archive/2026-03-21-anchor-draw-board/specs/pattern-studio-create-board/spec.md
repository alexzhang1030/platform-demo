## ADDED Requirements

### Requirement: Draw-board tool can be activated by clicking a board anchor
The system SHALL support activating the draw-board tool implicitly via an anchor click, in addition to the explicit toolbar button.

#### Scenario: Draw-board activated from anchor click
- **WHEN** the user clicks an anchor dot on a selected board while no create mode is active
- **THEN** the system SHALL treat the anchor's world position as the draw-board draft start point
- **THEN** subsequent pointer move and second click SHALL follow the normal draw-board commit flow from that start point
