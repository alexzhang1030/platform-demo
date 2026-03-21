# pattern-document-boxel-assemblies Specification

## Purpose
Define how pattern documents persist first-class boxel assemblies alongside boards, including connectivity-aware merge and split behavior.

## Requirements
### Requirement: Pattern documents support boxel assemblies
The system SHALL allow a `PatternDocument` to persist first-class boxel assemblies alongside boards, where each assembly represents one connected boxel structure rather than only one edit-history stack.

#### Scenario: Document contains boxel assemblies
- **WHEN** a pattern document includes boxel-based content
- **THEN** the document SHALL store that content in a dedicated `assemblies` collection
- **THEN** each assembly SHALL have its own identifier and persisted boxel data instead of only derived board geometry
- **THEN** each assembly SHALL represent one connected boxel component according to the system's face-connectivity rules

### Requirement: Boxel assemblies use uniform integer-grid cells
The system SHALL represent each boxel assembly as a set of occupied integer grid cells with one uniform cell size per assembly, and those cells SHALL be sufficient to recompute connectivity after add or remove operations.

#### Scenario: Assembly persists its occupied cells
- **WHEN** an assembly is serialized
- **THEN** each occupied boxel SHALL be represented by integer grid coordinates
- **THEN** the assembly SHALL store one cell-size value used by all of its cells
- **THEN** the persisted cells SHALL be enough to rebuild connected components without requiring a separate board-per-boxel representation

### Requirement: Boxel assemblies remain distinct from board entities
The system SHALL preserve boxel assemblies as their own entity type instead of flattening them into standalone boards at persistence time, even when connectivity changes merge or split assemblies.

#### Scenario: Document is parsed after boxel edits
- **WHEN** a document containing boxel assemblies is loaded
- **THEN** the parsed result SHALL preserve each assembly as a boxel entity
- **THEN** the system SHALL NOT require a board-per-boxel representation to recover the assembly structure
- **THEN** the system SHALL be able to recompute merged or split boxel connectivity from the persisted assembly cells
