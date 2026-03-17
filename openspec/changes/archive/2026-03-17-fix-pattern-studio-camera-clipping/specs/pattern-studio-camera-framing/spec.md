## ADDED Requirements

### Requirement: Pattern studio preview camera frames the active board workspace
The system SHALL derive the 3D preview camera framing from the current board workspace bounds instead of relying on a single hard-coded world position and target.

#### Scenario: Preview opens with boards offset from the origin
- **WHEN** the current document contains boards whose extents are not centered around the previous default camera target
- **THEN** the 3D preview camera SHALL still frame the visible board workspace
- **THEN** the preview SHALL target the actual board bounds rather than an implicit fixed origin

### Requirement: Pattern studio preview avoids normal-view clipping
The system SHALL configure camera clipping planes so the visible board geometry remains inside the camera frustum during normal orbit navigation.

#### Scenario: User slightly orbits around the workspace
- **WHEN** the user moves the preview camera by a small orbit or pan around the framed board workspace
- **THEN** the visible board geometry SHALL remain rendered
- **THEN** geometry SHALL not disappear because the camera `near` or `far` plane is too tight for the current workspace scale
