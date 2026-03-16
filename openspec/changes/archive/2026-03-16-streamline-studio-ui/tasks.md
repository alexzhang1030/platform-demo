## 1. Routing and shell entry

- [x] 1.1 Remove the standalone home page from the active app flow and route `/` directly to the editor
- [x] 1.2 Reduce primary navigation to the editor and generator destinations only

## 2. Compact layout

- [x] 2.1 Tighten the global shell spacing so the header and outer containers consume less vertical and horizontal space
- [x] 2.2 Compress editor panel gaps, padding, and non-essential section chrome to maximize workspace area
- [x] 2.3 Apply the same compact layout treatment to the generator so it matches the editor shell

## 3. Copy and overflow cleanup

- [x] 3.1 Remove or shorten low-value shell copy and wrappers that do not directly support tool usage
- [x] 3.2 Ensure overflow stays inside owned containers and the page remains single-screen during normal use

## 4. Validation

- [x] 4.1 Verify the updated shell with typecheck and production build
- [x] 4.2 Manually verify root routing, editor navigation, generator navigation, and compact single-screen behavior
