## 1. Protocol Types

- [x] 1.1 Add `BoardAnchorSide` type (`'top' | 'left' | 'right' | 'bottom'`) to `packages/protocol`
- [x] 1.2 Add `BoardAnchorEndpoint` interface (`{ boardId: string; anchor: BoardAnchorSide }`) to `packages/protocol`
- [x] 1.3 Add `BoardConnection` interface (`{ a: BoardAnchorEndpoint; b: BoardAnchorEndpoint }`) to `packages/protocol`
- [x] 1.4 Add `BoardGroup` interface (`{ id: string; name: string; boardIds: string[]; connections: BoardConnection[] }`) to `packages/protocol`
- [x] 1.5 Add `boardGroups` field to `PatternDocument` with `default([])` in Zod schema and TypeScript interface
- [x] 1.6 Add Zod schemas for all new types and update `patternDocumentSchema`

## 2. Core Logic — Anchor Computation

- [x] 2.1 Add `getBoardAnchorPositions(board: Board): Record<BoardAnchorSide, ControlPoint>` to `packages/core` — derives world-space anchor midpoints from outline bounding box + transform
- [x] 2.2 Add `findAnchorConnections(boards: Board[], threshold: number): BoardConnection[]` to `packages/core` — returns all anchor pairs within snap threshold across all board pairs

## 3. Core Logic — Group Merge / Split

- [x] 3.1 Add `mergeBoardsThroughConnection(groups: BoardGroup[], connection: BoardConnection, newBoardId?: string): BoardGroup[]` to `packages/core` — creates or extends groups when a connection is formed (mirrors `mergeAssembliesThroughWorldCell`)
- [x] 3.2 Add `splitBoardGroupAfterRemoval(groups: BoardGroup[], removedBoardId: string): BoardGroup[]` to `packages/core` — re-evaluates group connectivity after a board is removed and splits disconnected subsets (mirrors `splitAssemblyIntoConnectedComponents`)
- [x] 3.3 Add unit tests for merge and split covering: two isolated boards connect, board connects to existing group, bridge board removal splits group, single-board remnant becomes ungrouped

## 4. App Layer — Document Operations

- [x] 4.1 Add `evaluateBoardGroupsAfterAdd(document: PatternDocument, addedBoardId: string, threshold: number): PatternDocument` in `apps/web/src/lib/pattern-studio.ts` — calls `findAnchorConnections` and `mergeBoardsThroughConnection` after a board is committed
- [x] 4.2 Add `evaluateBoardGroupsAfterRemove(document: PatternDocument, removedBoardId: string): PatternDocument` in `apps/web/src/lib/pattern-studio.ts` — calls `splitBoardGroupAfterRemoval` and cleans up the removed board from groups
- [x] 4.3 Wire `evaluateBoardGroupsAfterAdd` into the create-board commit flow in the editor page
- [x] 4.4 Wire `evaluateBoardGroupsAfterRemove` into the board delete flow in the editor page

## 5. App Layer — Selection & Movement

- [x] 5.1 Add `getBoardGroupForBoard(groups: BoardGroup[], boardId: string): BoardGroup | null` helper in `pattern-studio.ts`
- [x] 5.2 Update board click-selection logic in the editor to select all boards in the group when any member is clicked
- [x] 5.3 Update board drag-move logic to translate all boards in the group together when any member is dragged

## 6. Viewport — Anchor Indicators

- [x] 6.1 Add anchor marker rendering in `board-preview-3d.tsx` — show small visual indicators at each board's four anchor points when the board is selected or hovered
- [x] 6.2 Highlight active anchor pair during board creation preview when an anchor-to-anchor snap is detected
