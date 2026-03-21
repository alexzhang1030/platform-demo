## Why

Boards currently exist as independent objects with no structural awareness of each other. Users need a way to declare that boards are physically connected — snapping them together at their edges should unify them into a single moveable and editable assembly, consistent with how boxel cells merge into a `BoxelAssembly`.

## What Changes

- Add four fixed **anchor points** to every board: `top`, `left`, `right`, `bottom` — each located at the midpoint of the corresponding board edge.
- Introduce a **board group** entity (analogous to `BoxelAssembly`) that holds a set of boards treated as one structural unit.
- When two boards are placed such that an anchor from one coincides with an anchor from another, the system automatically merges them into one board group (or extends an existing one).
- Moving, selecting, or operating on any board in a group affects the whole group, mirroring boxel assembly behavior.
- Removing the anchor connection that bridged two subsets splits the group back into separate groups.

## Capabilities

### New Capabilities

- `board-anchors`: Anchor points defined at the top, left, right, and bottom midpoints of a board. Anchors are attachment sites for inter-board connections.
- `board-group`: A first-class entity representing a set of boards connected through anchors, stored in `PatternDocument`. Provides unified selection, movement, and serialization — mirroring `BoxelAssembly`.

### Modified Capabilities

- `pattern-studio-create-board`: When a newly created or moved board's anchor aligns with another board's anchor, the system SHALL automatically join the two boards into a board group (or extend an existing group), consistent with how boxel-mode merges assemblies.

## Impact

- `packages/protocol`: Add `BoardAnchor`, `BoardConnection`, and `BoardGroup` types; extend `PatternDocument` with a `boardGroups` collection and its Zod schema.
- `packages/core`: Add anchor-position computation, anchor-proximity detection, board-group merge/split logic (mirroring `mergeAssembliesThroughWorldCell` / `splitAssemblyIntoConnectedComponents`).
- `apps/web` (pattern-studio): Wire anchor snapping into the create-board and move-board flows; render anchor indicators in the 3D viewport; apply group-level selection and transform.
