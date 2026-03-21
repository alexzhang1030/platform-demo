## Context

Boards in the pattern studio are independent objects. There is no way for two boards to declare that they are physically joined at an edge. The boxel system already has a mature connectivity model (`BoxelAssembly`, face-adjacency detection, merge/split on add/remove). The board anchor feature mirrors that model for boards, using four explicit anchor sites per board (top, left, right, bottom) instead of implicit face-adjacency.

Current state:
- `Board` has `id`, `transform`, `outline`, `holes`. No anchor or group concept.
- `PatternDocument` has `boards[]` and `assemblies[]`. No `boardGroups`.
- Board move snapping exists for upright dovetail joints (`findClosestUprightBoardMoveSnap`) but does not produce a persistent group entity.

## Goals / Non-Goals

**Goals:**
- Define four named anchor sites per board derived purely from its outline bounding box.
- Introduce a `BoardGroup` entity that lists the board IDs it owns, plus the `BoardConnection`s between them.
- Auto-merge boards into groups (and split groups) as anchors come into and leave contact, mirroring boxel assembly merge/split.
- Persist `boardGroups` in `PatternDocument` and validate via Zod.
- Group-level selection: selecting any member board selects the whole group.

**Non-Goals:**
- Custom anchor placement (anchors are always at midpoints of the four edges).
- More than four anchors per board in v1.
- Visual joints or geometry modification at the anchor connection site (that is the dovetail/socket workflow's responsibility).
- Anchor behavior for non-upright boards in v1.

## Decisions

### D1: Anchors are derived, not stored

Anchor positions are computed from the board's `outline` bounding box and `transform` at runtime. Storing them would duplicate data and create sync issues.

**Why**: The boxel model derives face contacts from cell coordinates; the same principle applies here. Anchors don't need to be persisted because they can always be recomputed.

**Alternatives considered**: Storing anchors in the `Board` schema — rejected because it adds schema churn whenever the outline changes.

### D2: `BoardGroup` is a first-class document entity

A new `boardGroups: BoardGroup[]` array is added to `PatternDocument` (alongside `boards` and `assemblies`). Each group has its own `id`, a list of `boardIds`, and a list of `connections` (pairs of `{ boardId, anchor }` tuples).

**Why**: Mirrors `BoxelAssembly` as a first-class entity. Makes group identity stable across edits and serializable without re-deriving connectivity on every load. Enables future features (group color, group name, shared material) without schema changes.

**Alternatives considered**: Deriving groups on the fly from anchor proximity — rejected because it loses user-authored group identity and requires expensive re-derivation on every render.

### D3: Merge/split triggered by anchor contact

When a board is created or moved so that one of its anchors is within a snap threshold of another board's anchor, the two boards are joined into a group (or their existing groups are merged). When a board is removed or moved away, the system re-evaluates connectivity and splits the group if needed — exactly like `mergeAssembliesThroughWorldCell` / `splitAssemblyIntoConnectedComponents`.

**Why**: Consistent with boxel UX: users think in terms of physical contact, not explicit "connect" actions.

### D4: Core logic lives in `packages/core`

Anchor computation, proximity detection, group merge, and group split are placed in `packages/core` (alongside `boxel.ts` / `upright-board.ts`). App-layer (`pattern-studio.ts`) calls these functions and updates the document.

**Why**: Matches the existing layering rule: render-agnostic logic in core, UI wiring in app layer.

## Risks / Trade-offs

- **Risk: anchor collision ambiguity** — If two boards have multiple anchors within threshold simultaneously, an arbitrary merge order could produce unintended groups. → Mitigation: process one anchor pair at a time, prioritize the closest pair.
- **Risk: group split correctness** — Split logic must handle chains of three or more boards correctly. → Mitigation: reuse the connected-components algorithm already proven for boxels.
- **Risk: schema version** — `boardGroups` is a new field on `PatternDocument`. Old documents without it must still parse. → Mitigation: `boardGroups` defaults to `[]` in the Zod schema (same pattern as `assemblies`).

## Migration Plan

1. Add `boardGroups` to `PatternDocument` with `default([])` in Zod — old documents continue to parse.
2. Ship core logic and protocol types; no UI changes needed for existing boards.
3. Wire UI snap/move flows to call group merge/split.
4. Render anchor indicators and group selection highlight in editor viewport.

No rollback complexity — the field is additive and defaults to empty.

## Open Questions

- Should anchor snapping apply to flat (non-upright) boards in v1, or upright only? (Current proposal says upright only.)
- What is the exact snap threshold distance in world units? (Suggest: same as `CREATE_BOARD_GRID_SIZE = 40`.)
