## ADDED Requirements

### Requirement: Application enters directly into tool routes
The web application SHALL treat the editor and generator as the primary product surfaces and SHALL not require a separate home page to begin using the tool.

#### Scenario: Open root path
- **WHEN** the user navigates to `/`
- **THEN** the application routes directly to the editor workflow

#### Scenario: Navigate between tool routes
- **WHEN** the user uses the primary navigation
- **THEN** the application presents only `editor` and `generator` as top-level destinations

### Requirement: Studio shell uses compact spacing
The studio shell SHALL minimize outer gaps, header padding, and panel spacing so the workspace occupies the maximum practical area within a single screen.

#### Scenario: Render compact shell on desktop
- **WHEN** the editor or generator renders on a desktop viewport
- **THEN** the top bar, left panel, right panel, and center workspace use reduced spacing compared with the current shell
- **AND** the page does not require outer document scrolling during normal use

### Requirement: Panels preserve internal scrolling
The editor and generator SHALL keep scrolling inside the panels or workspace containers that own overflow rather than on the page body.

#### Scenario: Overflow inside compact panel
- **WHEN** a sidebar or content panel exceeds the visible viewport height
- **THEN** that panel scrolls internally
- **AND** the application shell remains locked to a single-screen layout

### Requirement: Low-value shell content is removed
The studio shell SHALL remove non-essential copy and wrappers that do not directly support editing or generation.

#### Scenario: Render compact editor shell
- **WHEN** the editor loads
- **THEN** the shell omits standalone home-page content and unnecessary explanatory copy
- **AND** the remaining controls still expose the core editor and generator workflows
