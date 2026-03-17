# editor-pip-resize Specification

## Purpose
TBD - created by archiving change add-resizable-fullscreen-pip. Update Purpose after archive.
## Requirements
### Requirement: Editor PiP supports three explicit size levels
The system SHALL support three explicit editor PiP levels: compact, expanded, and fullscreen workspace coverage.

#### Scenario: User advances the PiP size level
- **WHEN** the user activates the PiP size control
- **THEN** the PiP advances through compact, expanded, and fullscreen levels
- **THEN** the compact and expanded levels remain bottom-right anchored floating presets within workspace bounds

### Requirement: PiP can expand to cover the workspace
The system SHALL allow the PiP to enter a fullscreen state that covers the main editor workspace area up to its usable bounds.

#### Scenario: User maximizes the PiP
- **WHEN** the user activates the PiP maximize control
- **THEN** the PiP expands to the maximum workspace size instead of only switching to a larger inset preset
- **THEN** the PiP still exposes controls to return to a bounded floating level

### Requirement: Fullscreen PiP suppresses hidden 3D rendering
The system SHALL stop rendering the underlying 3D preview while the fullscreen PiP visually replaces it.

#### Scenario: PiP covers the workspace
- **WHEN** the PiP is in fullscreen mode
- **THEN** the hidden `BoardPreview3D` render path is skipped, paused, or unmounted
- **THEN** the editor restores the 3D preview when the PiP exits fullscreen mode

### Requirement: Existing PiP interactions remain available
The system SHALL preserve existing PiP drag, zoom reset, and split-workspace behavior while using preset level switching instead of freeform resizing.

#### Scenario: User exits fullscreen or steps back down
- **WHEN** the PiP leaves fullscreen mode or returns to a floating level
- **THEN** drag controls still work
- **THEN** the PiP continues to render the 2D board workspace with the existing zoom and editing interactions
- **THEN** the split editor can resume showing the 3D preview behind the PiP

