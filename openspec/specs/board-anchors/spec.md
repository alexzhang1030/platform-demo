# board-anchors Specification

## Purpose
Defines named anchor points on boards and the rules for detecting when anchors from different boards are in proximity to one another.

## Requirements

### Requirement: Boards expose named anchor points
Each board SHALL define a fixed set of named anchor points that describe key geometric positions on the board (such as corners, midpoints, or connection sites).

#### Scenario: Board anchor points are accessible
- **WHEN** a board exists in the document
- **THEN** the board SHALL expose at least four named anchor points
- **THEN** each anchor point SHALL have a stable name and a 3D position derived from the board's current transform and geometry

### Requirement: Anchor point names are unique per board
Each named anchor on a board SHALL have a unique name within that board's anchor set.

#### Scenario: Anchors are enumerated for a board
- **WHEN** the system enumerates anchor points for a board
- **THEN** no two anchors on the same board SHALL share the same name

### Requirement: Anchor proximity detection is supported
The system SHALL detect when an anchor from one board is within a defined proximity threshold of an anchor from another board.

#### Scenario: Two anchors are within proximity
- **WHEN** an anchor on board A is within the proximity threshold distance of an anchor on board B
- **THEN** the system SHALL report that anchor pair as a proximity contact

#### Scenario: Two anchors are outside proximity
- **WHEN** an anchor on board A is farther from all anchors on board B than the proximity threshold
- **THEN** no proximity contact SHALL be reported for that pair

### Requirement: Anchor proximity threshold is configurable
The proximity detection threshold used for anchor contact checks SHALL be a configurable value rather than a hard-coded constant.

#### Scenario: Proximity threshold is applied consistently
- **WHEN** the proximity threshold is set to a given value
- **THEN** all anchor proximity checks in the system SHALL use that same threshold value
