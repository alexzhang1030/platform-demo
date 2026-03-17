## 1. PiP state model

- [x] 1.1 Replace the current binary PiP expand state with an explicit three-level PiP model: compact, expanded, and fullscreen
- [x] 1.2 Keep non-fullscreen PiP anchored to the bottom-right corner while preserving drag offset and reset behavior

## 2. Size and fullscreen behavior

- [x] 2.1 Remove direct resize handles and edge-based sizing interactions from the PiP toolbar
- [x] 2.2 Make the maximize control advance through the three PiP levels, including fullscreen coverage of the workspace region
- [x] 2.3 Ensure exiting fullscreen returns the PiP to a bounded floating preset instead of an arbitrary freeform size

## 3. Rendering optimization

- [x] 3.1 Skip, pause, or unmount `BoardPreview3D` while fullscreen PiP is active
- [x] 3.2 Restore the 3D preview when fullscreen PiP exits back to compact or expanded split mode

## 4. Validation

- [x] 4.1 Verify PiP drag, level switching, restore, and zoom-reset interactions all still work together
- [x] 4.2 Verify fullscreen PiP fully covers the main workspace region and does not leave the hidden 3D preview rendering behind it
- [x] 4.3 Run `bun run --cwd apps/web typecheck` and `bun run --cwd apps/web build`
