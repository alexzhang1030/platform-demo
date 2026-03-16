## ADDED Requirements

### Requirement: Routed editor workflow
The web application SHALL expose an editor workflow at `/editor` within the same app as the landing page and generator.

#### Scenario: Open editor route
- **WHEN** the user navigates to `/editor`
- **THEN** the application renders the board list, 2D outline canvas, preview panel, and board inspector

### Requirement: Preset-driven board creation
The editor SHALL allow users to add boards from predefined presets.

#### Scenario: Add preset board
- **WHEN** the user selects a board preset in the editor
- **THEN** the system appends a new board with preset outline geometry, thickness, and transform defaults
- **AND** the new board becomes the selected board

### Requirement: Board property editing
The editor SHALL allow users to update the selected board's metadata and transform values.

#### Scenario: Edit board properties
- **WHEN** the user changes the selected board's name, material, thickness, position, or rotation
- **THEN** the active document is updated immediately
- **AND** the 2D canvas and preview reflect the new values

### Requirement: 2D outline manipulation
The editor SHALL let users reshape the selected board by dragging visible control points in the 2D SVG canvas.

#### Scenario: Drag outline point
- **WHEN** the user drags a visible point on the selected board outline
- **THEN** the board outline updates to the dragged coordinates
- **AND** the board remains a closed shape in the pattern document

### Requirement: Preview synchronization
The editor MUST derive its depth preview from the same active document used by the 2D editor.

#### Scenario: Sync preview after edit
- **WHEN** the user edits board geometry or properties in the editor
- **THEN** the preview panel updates from the same document state without requiring a separate conversion step
