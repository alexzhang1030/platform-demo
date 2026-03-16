## ADDED Requirements

### Requirement: Pattern document schema
The system SHALL represent board patterns as a versioned `PatternDocument` JSON document with metadata, boards, transforms, outline geometry, and hole geometry.

#### Scenario: Create default document
- **WHEN** the application initializes a new pattern
- **THEN** it produces a valid `PatternDocument` with version `1.0`, unit `mm`, metadata timestamps, and at least one board entry

#### Scenario: Parse imported document
- **WHEN** the generator receives a JSON string from a user upload
- **THEN** the system validates it against the `PatternDocument` schema before using it

### Requirement: Import validation feedback
The system MUST reject invalid pattern documents and surface structured validation issues to the user.

#### Scenario: Schema validation fails
- **WHEN** an uploaded JSON document is missing required fields or contains invalid field types
- **THEN** the generator does not replace the active document
- **AND** the UI displays one or more readable validation issue messages

#### Scenario: JSON is malformed
- **WHEN** the uploaded file cannot be parsed as JSON
- **THEN** the generator reports the parse failure as an import issue

### Requirement: JSON export
The editor SHALL serialize the active `PatternDocument` as formatted JSON for download and reuse.

#### Scenario: Export pattern document
- **WHEN** the user exports from the editor
- **THEN** the system downloads a `pattern.json` file containing the full active document
- **AND** the same document becomes available for the generator workflow
