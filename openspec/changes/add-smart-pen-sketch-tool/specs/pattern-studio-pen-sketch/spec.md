## ADDED Requirements

### Requirement: Freehand Sketch Interaction
The system SHALL provide a pen tool that allows the user to draw freehand paths on the ground plane in the 3D workspace.
- The tool SHALL collect a sequence of points during a pointer-down-drag-up gesture.
- The tool SHALL render a live line preview of the path while drawing.

#### Scenario: User draws a freehand path
- **WHEN** the user activates the pen tool and drags the pointer on the ground plane
- **THEN** a visible line follows the pointer in 3D space
- **THEN** the system collects the path points for processing

### Requirement: Rectangle Gesture Recognition
The system SHALL interpret a closed, roughly rectangular freehand path as an enclosure request.
- The recognition SHALL calculate the bounding box of the path.
- The system SHALL generate four upright boards aligned to the sides of the bounding box.
- The generated boards SHALL be automatically joined into a new `BoardGroup`.

#### Scenario: User sketches a rectangle
- **WHEN** the user sketches a messy rectangular loop and releases the pointer
- **THEN** the system generates four upright boards forming a hollow frame at that location
- **THEN** the boards are automatically grouped together

### Requirement: Circle Gesture Recognition
The system SHALL interpret a closed, roughly circular freehand path as a single circular board request.
- The recognition SHALL calculate the radius and center from the path's bounding box.
- The system SHALL generate one flat circular board at that location.

#### Scenario: User sketches a circle
- **WHEN** the user sketches a messy circular loop and releases the pointer
- **THEN** the system generates a single flat circular board matching the sketch's center and radius

### Requirement: Sketch Tool Activation
The system SHALL allow activating the pen sketch tool via a new "Pen" action in the editor toolbar.

#### Scenario: User selects the pen tool
- **WHEN** the user clicks the pen icon in the toolbar
- **THEN** the editor enters the `pen-sketch` tool state
- **THEN** normal selection and dragging are disabled while sketching
