## Why

The current `boxel-mode` can only stack upward within one column, so neighboring boxels on the X or Y axes still behave like separate structures even when they share a full face. We need boxel assemblies to recognize face-to-face contact as one connected whole, surface those contacts as `Joint Candidate`s, and stay structurally correct when users both add and remove individual boxels.

## What Changes

- Extend boxel connectivity so X-axis and Y-axis face-to-face neighbors are treated as one connected assembly, not separate stacks.
- Automatically merge multiple existing assemblies when a newly added boxel face-connects them.
- Add automatic `Joint Candidate` detection for full face-to-face contacts between neighboring boxels.
- Add support for removing a single boxel from an assembly.
- Recompute assembly connectivity after single-boxel removal so disconnected regions split into separate assemblies automatically.
- Keep `Joint Candidate` data derived from boxel adjacency rules rather than requiring manual authoring.

## Capabilities

### New Capabilities
- `pattern-studio-boxel-joint-candidates`: Defines how the system detects and labels face-to-face boxel contacts as derived joint candidates.

### Modified Capabilities
- `pattern-document-boxel-assemblies`: The assembly model now represents connected boxel components that can merge and split after add/remove operations.
- `pattern-studio-boxel-mode`: The editor behavior now supports lateral face-connected growth, automatic assembly merging, and single-boxel removal.

## Impact

- Affected code: `packages/core/src/boxel.ts`, `packages/protocol/src/index.ts`, `apps/web/src/lib/pattern-studio.ts`, and pattern studio 3D/editor UI under `apps/web/src/components/pattern-studio`.
- Affected UX: boxel placement, selection continuity, assembly identity, and boxel deletion behavior.
- Affected data model: assemblies continue to be persisted, but their membership semantics change from “single-column stack” to “connected face-sharing component”.
- Dependencies: no new external dependencies expected; this should build on the existing protocol/core/editor structure introduced for `boxel-mode`.
