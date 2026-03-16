/// <reference types="bun" />
import { createDefaultPatternDocument } from '@xtool-demo/protocol'
import { describe, expect, test } from 'bun:test'

import {
  createEditorSelection,
  moveBoardsByDelta,
  selectSingleBoard,
  toggleBoardSelection,
} from './pattern-studio'

describe('pattern studio selection helpers', () => {
  test('selectSingleBoard creates active single selection', () => {
    expect(selectSingleBoard('board-a')).toEqual({
      activeBoardId: 'board-a',
      selectedBoardIds: ['board-a'],
    })
  })

  test('toggleBoardSelection adds and removes boards', () => {
    const selection = createEditorSelection('board-a')
    const added = toggleBoardSelection(selection, 'board-b')
    const removed = toggleBoardSelection(added, 'board-a')

    expect(added).toEqual({
      activeBoardId: 'board-b',
      selectedBoardIds: ['board-a', 'board-b'],
    })
    expect(removed).toEqual({
      activeBoardId: 'board-b',
      selectedBoardIds: ['board-b'],
    })
  })
})

describe('pattern studio movement helpers', () => {
  test('moveBoardsByDelta moves only selected boards', () => {
    const document = createDefaultPatternDocument()
    const secondBoard = {
      ...document.boards[0],
      id: 'board-b',
      transform: {
        ...document.boards[0]!.transform,
        x: 120,
        y: 40,
      },
    }
    const nextDocument = {
      ...document,
      boards: [document.boards[0]!, secondBoard],
    }

    const moved = moveBoardsByDelta(nextDocument, ['board-b'], { x: 10, y: -8 })

    expect(moved.boards[0]!.transform).toEqual(nextDocument.boards[0]!.transform)
    expect(moved.boards[1]!.transform).toEqual({
      ...secondBoard.transform,
      x: 130,
      y: 32,
    })
  })
})
