## ADDED Requirements

### Requirement: Point-based Sketch Interaction
The system SHALL provide a tool that allows the user to define a shape by clicking points on the ground plane.
- Each click SHALL add a control point at the pointer's location.
- The tool SHALL render line segments connecting consecutive control points.
- The tool SHALL render a "closing" segment from the last point to the first point once 3 or more points exist.

#### Scenario: User places control points
- **WHEN** the user is in Smart Pen mode and clicks the ground plane
- **THEN** a new control point is added and visible in 3D space
- **THEN** a line segment connects it to the previous point

### Requirement: Polygon Classification
Upon committing the shape, the system SHALL classify the resulting polygon.
- A polygon with 3-6 points that is roughly rectangular SHALL be classified as a **Rectangle**.
- A polygon with 8+ points that is roughly circular SHALL be classified as a **Circle**.
- The system SHALL use the bounding box of the points to derive the final dimensions.

#### Scenario: Committing a rectangular enclosure
- **WHEN** the user places 4 points roughly in a square and clicks "Commit"
- **THEN** the system generates four upright boards forming a hollow frame

### Requirement: Shape Commitment
The user SHALL be able to finish and commit the shape via a "Commit" button in the overlay or a double-click on the ground plane.

#### Scenario: User double-clicks to finish
- **WHEN** the user double-clicks the ground plane after placing points
- **THEN** the system closes the polygon, classifies it, and generates the boards
