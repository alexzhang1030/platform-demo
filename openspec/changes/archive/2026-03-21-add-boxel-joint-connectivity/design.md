## Context

The first `boxel-mode` implementation introduced `BoxelAssembly` as a first-class persisted entity, but the editing flow is still column-based: clicks create a new assembly at an empty `(x, y)` column or stack upward within that exact same column. That means the persisted data can already express neighboring cells across X and Y, but the editor and shared core logic do not yet treat those neighbors as one structural whole.

The new request changes the meaning of an assembly. Instead of being “whatever cells were created through one column workflow,” an assembly should behave like a connected component of face-sharing boxels. This is also the right place to add `Joint Candidate` detection, because face-to-face adjacency is the same geometric relationship that determines whether two cells belong to the same connected structure. The change is cross-cutting because it affects core adjacency algorithms, editor authoring behavior, selection stability, and removal semantics.

## Goals / Non-Goals

**Goals:**
- Make X-axis and Y-axis face-to-face neighboring boxels belong to one connected assembly.
- Automatically merge multiple assemblies when a new cell bridges them by face contact.
- Detect face-to-face boxel contacts and expose them as derived `Joint Candidate`s.
- Support single-boxel removal from an assembly.
- Split an assembly into multiple assemblies automatically when removing one boxel disconnects the shape.
- Keep the connectivity and candidate logic in shared core code so editor behavior is deterministic and testable.

**Non-Goals:**
- Support diagonal or edge-only contact as a connection rule.
- Add manual joint editing or manual candidate overrides in this change.
- Define final fabrication output for joint candidates.
- Add free-form 3D painting, drag brushes, or arbitrary boolean voxel editing beyond add/remove single boxels.

## Decisions

### 1. Define assembly membership by face-connected components
An assembly will be treated as the connected component formed by all boxels that share a full face along the X or Y axes. The same connectivity rule will be used for both add and remove operations.

Why:
- It matches the requested “become one whole” behavior exactly.
- It avoids special-case merge bookkeeping because assembly identity comes from connectivity, not edit history.
- It gives deletion a principled outcome: if one removal disconnects the graph, the graph naturally becomes multiple assemblies.

Alternative considered:
- Keep assemblies as edit-history groups and only add a separate joint overlay. Rejected because it would leave connectivity and “whole object” semantics out of sync.

### 2. Keep `Joint Candidate` as derived adjacency, not persisted source-of-truth state
The system will compute joint candidates from face-sharing neighboring cells. A candidate exists when two boxels share a full face and belong to the same connected structure.

Why:
- The user asked for automatic detection, not manual authoring.
- Adjacency is deterministic from cell coordinates, so storing redundant candidate truth invites drift.
- It keeps the data model smaller and allows UI or export logic to consume the same derived relationship later.

Alternative considered:
- Persist a `jointCandidates[]` array directly in the document. Rejected because it duplicates information already implied by the cell graph and would need constant synchronization after every edit.

### 3. Merge on add, recompute components on remove
When adding a boxel, the editor will find all assemblies whose cells are face-adjacent to the new cell and merge them into one resulting assembly that includes the new cell. When removing a boxel, the editor will recompute connected components from the remaining cells and emit one or more assemblies accordingly.

Why:
- Add and remove are the two structural mutations that can change connectivity.
- Recomputing only the affected region keeps behavior correct without requiring a global document rewrite.

Alternative considered:
- Incrementally patch assembly metadata without component recomputation. Rejected because deletion-induced splits become error-prone and harder to reason about.

### 4. Introduce single-boxel removal as an assembly-scoped edit operation
The editor will add a removal path that targets one boxel cell within the selected assembly instead of only removing whole assemblies.

Why:
- The requested feature explicitly includes removing one boxel.
- Without single-cell removal, the connectivity/split behavior cannot be exercised by users.

Alternative considered:
- Postpone removal and only add connectivity on create. Rejected because the user explicitly requested removal and it is central to the new semantics.

### 5. Keep protocol changes minimal unless UI needs persisted removal/candidate state
The first implementation should prefer keeping protocol changes small. If joint candidates remain derived and removal is just another edit operation over `cells`, then most of the change can stay in core/editor logic without expanding persisted schema beyond what `BoxelAssembly` already stores.

Why:
- The current `BoxelAssembly` structure already stores enough information for connectivity analysis.
- This keeps migration costs low and reduces the amount of serialized state that might later need to be supported forever.

Alternative considered:
- Add new persisted candidate and substructure fields now. Rejected because they are not required to satisfy the requested behavior.

## Risks / Trade-offs

- [Assembly identity may feel less stable because merge/split can replace one assembly with several] → Mitigation: keep selection behavior explicit and always reselect the resulting affected assembly or assemblies predictably.
- [Derived joint candidates can be more expensive to compute as assemblies grow] → Mitigation: keep adjacency logic local to affected assemblies and expose reusable pure helpers in `packages/core`.
- [Single-boxel removal requires more precise 3D hit targeting than whole-assembly selection] → Mitigation: keep assembly selection at the group level but let remove mode resolve the clicked cell directly from the rendered box geometry.
- [The first rule set only connects along X/Y faces, not all possible 3D contacts] → Mitigation: document the rule clearly so future 3D connectivity expansion remains an explicit product decision.

## Migration Plan

1. Add shared boxel graph helpers for face adjacency, candidate derivation, merging, and component splitting.
2. Update boxel editor mutations so add/remove operations use the new connectivity helpers.
3. Extend 3D rendering and interaction to support single-boxel remove targeting and joint candidate feedback.
4. Verify mixed scenarios: lateral growth, merge-through-bridge, removal-driven split, and candidate derivation.

## Open Questions

- Whether face-to-face detection should treat vertical Z-face contacts as candidates in a later iteration, even though this change is explicitly focused on X/Y whole-structure merging.
- How prominently `Joint Candidate` labels should be shown in the UI in the first pass: always visible, selected-only, or hover-only.
