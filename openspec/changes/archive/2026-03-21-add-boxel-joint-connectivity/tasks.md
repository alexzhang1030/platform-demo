## 1. Connectivity and joint algorithms

- [x] 1.1 Add shared `packages/core` helpers for X/Y face adjacency, connected-component discovery, and assembly merge/split operations
- [x] 1.2 Add shared derivation helpers that compute `Joint Candidate`s from face-to-face boxel contacts
- [x] 1.3 Cover add, bridge-merge, single-boxel remove, and split-after-remove cases with focused tests

## 2. Editor data mutations

- [x] 2.1 Update boxel create mutations so a new boxel merges into any face-connected assembly instead of staying column-isolated
- [x] 2.2 Update boxel create mutations so one new boxel can merge multiple existing assemblies into one result
- [x] 2.3 Add single-boxel removal mutations that recompute connected assemblies after the targeted cell is removed

## 3. 3D interaction and feedback

- [x] 3.1 Extend `boxel-mode` interaction and preview logic to support lateral X/Y growth in addition to upward stacking
- [x] 3.2 Add a remove interaction for one targeted boxel within a selected assembly
- [x] 3.3 Surface `Joint Candidate` feedback in the editor so face-to-face contacts are identifiable

## 4. Validation

- [x] 4.1 Verify isolated add, lateral add, bridge-merge, and single-boxel remove scenarios in the editor
- [x] 4.2 Verify disconnected remnants split into separate assemblies after removal
- [x] 4.3 Run the relevant project checks and confirm existing non-boxel flows still work
