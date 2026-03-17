## ADDED Requirements

### Requirement: Pattern studio uses a documented scene light rig
The system SHALL render the pattern studio 3D preview with a dedicated scene light rig that includes three directional lights and one ambient light, matching the documented light layout used as the reference for the WebGPU editor viewer.

#### Scenario: Preview scene mounts
- **WHEN** the 3D preview scene is rendered
- **THEN** it uses one main directional light, two supporting directional lights, and one ambient light instead of an ad hoc light set embedded directly in the scene

### Requirement: Main light provides stable shadows
The system SHALL configure only the main directional light to cast shadows, and it SHALL use shadow settings that keep board geometry shadows stable in WebGPU rendering.

#### Scenario: Shadow-casting light is configured
- **WHEN** the light rig is created
- **THEN** only the main directional light casts shadows
- **THEN** the main light uses an orthographic shadow camera with explicit near, far, left, right, top, and bottom bounds
- **THEN** the main light applies explicit shadow map size, bias, normal bias, and radius values

### Requirement: Lighting responds to theme with smooth transitions
The system SHALL adapt light colors and intensities for light and dark themes, and it SHALL transition between theme targets smoothly instead of snapping.

#### Scenario: Theme changes while the preview is visible
- **WHEN** the resolved app theme changes from light to dark or dark to light
- **THEN** the light rig interpolates intensities and colors toward the new theme targets over multiple frames
- **THEN** dark mode uses cooler light colors and lower overall ambient intensity than light mode

### Requirement: Lighting refactor preserves current preview interactions
The system SHALL preserve existing board selection, outline, drag, camera, and renderer tone-mapping behavior while the new light rig is active.

#### Scenario: User interacts with the lit preview
- **WHEN** the new light rig is enabled
- **THEN** board selection and dragging continue to work
- **THEN** the existing WebGPU renderer tone mapping and exposure remain active
- **THEN** the preview continues to render without requiring SSGI or item-level point lights
