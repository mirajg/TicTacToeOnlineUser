import assert from 'node:assert/strict';
import test from 'node:test';
import { getGameResult } from '../game/gameLogic.js';

test('detects wins on rows, columns, and diagonals', () => {
    assert.deepEqual(getGameResult(['X', 'X', 'X', 'O', null, 'O', null, null, null]), {
        winner: 'X',
        reason: 'win',
    });
    assert.deepEqual(getGameResult(['O', 'X', 'X', 'O', 'X', null, 'O', null, null]), {
        winner: 'O',
        reason: 'win',
    });
});

test('recognizes a draw and leaves unfinished boards active', () => {
    assert.deepEqual(getGameResult(['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X']), {
        winner: null,
        reason: 'draw',
    });
    assert.equal(getGameResult(['X', 'O', null, null, null, null, null, null, null]), null);
});
