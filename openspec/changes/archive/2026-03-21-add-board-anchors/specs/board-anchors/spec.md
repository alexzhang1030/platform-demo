## ADDED Requirements

### Requirement: Every board exposes four named anchor points
The system SHALL derive four named anchor points — `top`, `left`, `right`, `bottom` — for every board from its outline bounding box and world transform.

#### Scenario: Anchor positions are derived from board geometry
- **WHEN** a board exists in the document with a valid outline and transform
- **THEN** the system SHALL compute its `top` anchor at the world-space midpoint of its top edge
- **THEN** the system SHALL compute its `left` anchor at the world-space midpoint of its left edge
- **THEN** the system SHALL compute its `right` anchor at the world-space midpoint of its right edge
- **THEN** the system SHALL compute its `bottom` anchor at the world-space midpoint of its bottom edge

### Requirement: Anchor positions update when a board is moved or resized
The system SHALL recompute anchor positions whenever a board's transform or outline changes.

#### Scenario: Board transform changes
- **WHEN** the board's `transform` is updated (position or rotation)
- **THEN** the system SHALL produce updated anchor positions on the next derivation call
- **THEN** stale cached positions from the previous transform SHALL NOT be used

### Requirement: Anchor proximity detection identifies connectable anchor pairs
The system SHALL identify pairs of anchors — one from each of two different boards — whose world-space distance is within the snap threshold.

#### Scenario: Two anchors are within snap range
- **WHEN** an anchor on board A and an anchor on board B are within the configured snap threshold distance
- **THEN** the system SHALL report that pair as a candidate connection
- **THEN** the reported pair SHALL include the board IDs and anchor sides for both endpoints

#### Scenario: No anchors are within snap range
- **WHEN** no anchor on any board is within snap threshold of any anchor on another board
- **THEN** the system SHALL report an empty candidate set
