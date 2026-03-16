## ADDED Requirements

### Requirement: Routed generator workflow
The web application SHALL expose a generator workflow at `/generator` within the same app as the landing page and editor.

#### Scenario: Open generator route
- **WHEN** the user navigates to `/generator`
- **THEN** the application renders import controls, validation feedback, SVG preview, and SVG payload output

### Requirement: Reuse editor document in generator
The generator SHALL allow the user to seed its active document from the editor's current output.

#### Scenario: Use editor output
- **WHEN** the user chooses to use the editor output in the generator
- **THEN** the generator replaces its active document with the current editor document
- **AND** the JSON payload display updates to the same document

### Requirement: SVG preview generation
The generator MUST render a cut-layout preview from the active pattern document.

#### Scenario: Preview imported document
- **WHEN** a valid pattern document is active in the generator
- **THEN** each board is rendered in the preview area as a positioned outline derived from its transformed geometry

### Requirement: SVG document export
The generator SHALL produce a downloadable SVG document from the active pattern document.

#### Scenario: Download SVG
- **WHEN** the user downloads from the generator
- **THEN** the system exports a single SVG document containing all active boards
- **AND** the SVG uses millimeter dimensions based on the document bounds

### Requirement: SVG payload visibility
The generator MUST display the generated SVG payload in a bounded readable container.

#### Scenario: Payload exceeds panel width
- **WHEN** the generated SVG markup contains long unbroken content
- **THEN** the payload view wraps or scrolls within the panel without overflowing the generator layout
