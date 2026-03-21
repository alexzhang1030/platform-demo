## ADDED Requirements

### Requirement: Pattern documents support board groups
The system SHALL allow a `PatternDocument` to persist first-class board groups, where each group represents one set of boards connected through anchor contacts.

#### Scenario: Document contains board groups
- **WHEN** a pattern document includes board groups
- **THEN** the document SHALL store them in a dedicated `boardGroups` collection
- **THEN** each group SHALL have its own identifier, a list of member board IDs, and a list of connections
- **THEN** each connection SHALL record the two `{ boardId, anchor }` endpoints that form the link

#### Scenario: Document without board groups is still valid
- **WHEN** a document is loaded that has no `boardGroups` field
- **THEN** the system SHALL treat `boardGroups` as an empty array
- **THEN** parsing SHALL succeed without errors

### Requirement: Placing a board whose anchor contacts another board's anchor creates a group
The system SHALL automatically create or extend a board group when a board is placed or moved such that one of its anchors is within snap threshold of another board's anchor.

#### Scenario: Two unconnected boards snap together
- **WHEN** board A is placed or moved so its anchor aligns with board B's anchor (within snap threshold)
- **THEN** the system SHALL create a new `BoardGroup` containing both boards
- **THEN** the group SHALL record the connection as the matched anchor pair

#### Scenario: New board connects to an existing group
- **WHEN** a board C's anchor aligns with an anchor of a board already belonging to group G
- **THEN** the system SHALL add board C to group G
- **THEN** the new connection SHALL be appended to group G's connection list

#### Scenario: New board bridges two separate groups
- **WHEN** board C's anchors align with anchors from two boards belonging to different groups G1 and G2
- **THEN** the system SHALL merge G1 and G2 and board C into one resulting group
- **THEN** both connections SHALL be recorded in the merged group

### Requirement: Removing a connecting board splits a group
The system SHALL split a board group when the removed board was the only structural bridge between two subsets of the group.

#### Scenario: Removed board was the bridge
- **WHEN** the board removed from a group causes the remaining boards to form two or more disconnected subsets
- **THEN** the system SHALL replace the original group with one group per remaining connected subset
- **THEN** subsets with only one board SHALL become ungrouped (no group entity)

### Requirement: Group members are selected as a unit
The system SHALL treat all boards in a group as a single selection unit.

#### Scenario: User selects any board in a group
- **WHEN** the user clicks or selects a board that belongs to a board group
- **THEN** the editor SHALL select the entire group
- **THEN** all member boards SHALL be highlighted as selected

#### Scenario: User moves a group
- **WHEN** the user drags any board in the group
- **THEN** all boards in the group SHALL move together, preserving their relative positions
