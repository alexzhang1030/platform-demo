## 1. Document and core model

- [x] 1.1 Extend `packages/protocol` with `BoxelAssembly` types, schema validation, and document serialization support
- [x] 1.2 Add shared `packages/core` helpers for boxel cell occupancy, world placement, and assembly bounds
- [x] 1.3 Update document consumers to tolerate documents that contain both `boards` and `assemblies`

## 2. Editor tool and selection

- [x] 2.1 Add `boxel-mode` to the editor tool state and visible tool affordances
- [x] 2.2 Extend editor selection state and helpers so boxel assemblies are selected as first-class entities
- [x] 2.3 Define the v1 boxel interaction flow: create new assembly on empty column and stack upward on the same column

## 3. 3D viewport rendering and interaction

- [x] 3.1 Render committed boxel assemblies as stacked cubes in the 3D workspace
- [x] 3.2 Add snapped ground-plane hover and preview feedback for `boxel-mode`
- [x] 3.3 Commit new assemblies and upward stack additions from viewport clicks without conflicting with existing board interactions

## 4. Validation

- [x] 4.1 Verify document round-trip behavior for boxel assemblies and mixed board-plus-assembly documents
- [x] 4.2 Verify `boxel-mode` create, upward stacking, and assembly-level selection in the editor
- [x] 4.3 Verify non-boxel flows still work and run the relevant project checks before implementation is considered complete
