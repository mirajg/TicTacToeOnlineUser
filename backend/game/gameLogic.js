const winningLines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
];

export function getGameResult(board) {
    for (const [first, second, third] of winningLines) {
        const mark = board[first];

        if (mark && mark === board[second] && mark === board[third]) {
            return { winner: mark, reason: 'win' };
        }
    }

    if (board.every(Boolean)) {
        return { winner: null, reason: 'draw' };
    }

    return null;
}
