## ADDED Requirements

### Requirement: User-selectable studio theme
The studio SHALL expose a visible theme control that allows the user to select `light`, `dark`, or `system` theme from the shared application chrome.

#### Scenario: User selects dark theme
- **WHEN** the user chooses the dark theme from the shared theme control
- **THEN** the app SHALL apply dark theme styling across the studio shell, editor, generator, and shared floating controls

#### Scenario: User selects system theme
- **WHEN** the user chooses the system theme from the shared theme control
- **THEN** the app SHALL resolve the active theme from the operating system preference and apply the matching studio theme

### Requirement: Persisted theme preference
The studio SHALL persist the user's selected theme and reuse it on later visits.

#### Scenario: Reload preserves explicit theme
- **WHEN** the user selects light or dark theme and reloads the app
- **THEN** the app SHALL restore the same explicit theme without requiring the user to reselect it

#### Scenario: System theme follows OS changes
- **WHEN** the selected theme is system and the operating system color preference changes
- **THEN** the app SHALL update the active studio theme to match the new system preference

### Requirement: Theme-aware studio surfaces
The studio SHALL render shell surfaces, editor panels, generator panels, floating controls, and workspace wrappers with theme-appropriate contrast in both light and dark modes.

#### Scenario: Editor remains legible in dark theme
- **WHEN** the app is rendered in dark theme on the editor route
- **THEN** text, borders, panels, floating controls, and selection affordances SHALL remain visible and visually distinct

#### Scenario: Generator remains legible in dark theme
- **WHEN** the app is rendered in dark theme on the generator route
- **THEN** payload previews, import controls, export controls, and SVG preview wrappers SHALL remain visible and visually distinct

### Requirement: Theme-aware workspace overlays
The studio SHALL keep 2D and 3D workspace overlay controls readable in both themes.

#### Scenario: 2D overlay controls in dark theme
- **WHEN** the app is rendered in dark theme and the 2D workspace overlay is visible
- **THEN** zoom controls, inset controls, and overlay labels SHALL retain sufficient contrast against the canvas and panel backgrounds

#### Scenario: 3D overlay controls in dark theme
- **WHEN** the app is rendered in dark theme and the 3D workspace overlay is visible
- **THEN** viewport mode controls, view preset controls, and preview wrapper chrome SHALL retain sufficient contrast against the scene background
