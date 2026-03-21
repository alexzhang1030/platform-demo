## ADDED Requirements

### Requirement: Parallel Wall Detection
The system SHALL identify the longest pair of parallel upright boards within a `BoardGroup` to serve as the supporting walls for the roof.
- Parallel walls SHALL be identified by matching `rotation` values (0° or 90°).
- The system SHALL calculate the span between these two walls.

#### Scenario: Identifying wall pairs
- **WHEN** a group has 4 walls (2 at 0°, 2 at 90°)
- **THEN** the system SHALL select the longest parallel pair as the roof support candidates

### Requirement: Automatic Roof Geometry Calculation
The system SHALL automatically calculate the `pitch` and `length` of two roof panels to ensure they meet at a peak.
- The default `pitch` SHALL be 45 degrees.
- The `length` of each panel SHALL be calculated as `Span / (2 * cos(pitch))`.
- The `z` elevation of the panels SHALL match the height of the supporting walls.

#### Scenario: Calculating roof for a square box
- **WHEN** the span between walls is 200mm and pitch is 45°
- **THEN** the system SHALL create two panels with length approx 141.4mm

### Requirement: One-click Roof Generation
The Board Group Inspector SHALL provide an "Add Gable Roof" button.
- Clicking the button SHALL generate two new `hinged` boards.
- The new boards SHALL be automatically added to the current `PatternDocument` and joined to the existing `BoardGroup`.

#### Scenario: Generating a roof
- **WHEN** the user selects a group and clicks "Add Gable Roof"
- **THEN** two angled panels appear at the top of the box, meeting at the center
