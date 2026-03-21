# pattern-studio-boxel-joint-candidates Specification

## Purpose
Define how the editor detects and surfaces face-to-face boxel contacts as derived joint candidates.

## Requirements
### Requirement: System detects face-to-face joint candidates automatically
The system SHALL automatically detect `Joint Candidate`s from face-to-face boxel contact.

#### Scenario: Two boxels share a full face
- **WHEN** two boxels in a connected structure share one full face along the X or Y axis
- **THEN** the system SHALL identify that contact as a `Joint Candidate`
- **THEN** the candidate SHALL be derived from boxel adjacency rather than requiring manual authoring

### Requirement: Joint candidate detection stays synchronized with boxel edits
The system SHALL update derived joint candidates after boxel add, merge, and remove operations.

#### Scenario: User edits a connected assembly
- **WHEN** boxel edits change the face-adjacency relationships within or across assemblies
- **THEN** the system SHALL recompute the affected `Joint Candidate`s
- **THEN** stale candidates from removed or disconnected contacts SHALL no longer be reported

### Requirement: Joint candidates follow connectivity-aware assembly merges
The system SHALL report joint candidates consistently when one edit merges multiple assemblies into one connected structure.

#### Scenario: New boxel bridges two assemblies
- **WHEN** a newly added boxel face-connects two previously separate assemblies
- **THEN** the resulting merged structure SHALL expose joint candidates for the new face contacts introduced by that merge
