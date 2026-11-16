import assert from 'node:assert/strict';
import test from 'node:test';
import { registerGameHandlers } from '../sockets/gameSocket.js';

class FakeSocket {
    constructor(id) {
        this.id = id;
        this.connected = true;
        this.handlers = new Map();
        this.outbound = [];
    }

    on(event, handler) {
        this.handlers.set(event, handler);
    }

    emit(event, payload) {
        this.outbound.push({ event, payload });
    }

    send(event, payload) {
        this.handlers.get(event)?.(payload);
    }

    received(event) {
        return this.outbound.filter((message) => message.event === event);
    }
}

function createGameServer() {
    const sockets = new Map();
    const ioHandlers = new Map();
    const io = {
        sockets: { sockets },
        on(event, handler) {
            ioHandlers.set(event, handler);
        },
        to(socketId) {
            return {
                emit(event, payload) {
                    sockets.get(socketId)?.emit(event, payload);
                },
            };
        },
    };

    registerGameHandlers(io);

    return {
        connect(id) {
            const socket = new FakeSocket(id);
            sockets.set(id, socket);
            ioHandlers.get('connection')(socket);
            return socket;
        },
        disconnect(socket) {
            socket.connected = false;
            socket.send('disconnect');
            sockets.delete(socket.id);
        },
    };
}

function startMatch() {
    const server = createGameServer();
    const firstPlayer = server.connect('first');
    const secondPlayer = server.connect('second');

    firstPlayer.send('join_game');
    secondPlayer.send('join_game');

    return { server, firstPlayer, secondPlayer };
}

test('matches two players and rejects out-of-turn and occupied-cell moves', () => {
    const { firstPlayer, secondPlayer } = startMatch();

    assert.equal(firstPlayer.received('game_start')[0].payload.player, 'X');
    assert.equal(secondPlayer.received('game_start')[0].payload.player, 'O');

    secondPlayer.send('make_move', { row: 0, col: 0 });
    assert.equal(secondPlayer.received('move_rejected').length, 1);

    firstPlayer.send('make_move', { row: 0, col: 0 });
    assert.equal(firstPlayer.received('move_made').length, 1);
    assert.equal(secondPlayer.received('move_made').length, 1);

    secondPlayer.send('make_move', { row: 0, col: 0 });
    assert.equal(secondPlayer.received('move_rejected').length, 2);

    secondPlayer.send('make_move', { row: 3, col: 0 });
    assert.equal(secondPlayer.received('move_rejected').length, 3);
});

test('ends a game after a valid win and reports disconnect wins', () => {
    const { firstPlayer, secondPlayer } = startMatch();
    const moves = [
        [firstPlayer, 0, 0],
        [secondPlayer, 1, 0],
        [firstPlayer, 0, 1],
        [secondPlayer, 1, 1],
        [firstPlayer, 0, 2],
    ];

    for (const [socket, row, col] of moves) {
        socket.send('make_move', { row, col });
    }

    const firstPlayerResults = firstPlayer.received('game_over');
    const secondPlayerResults = secondPlayer.received('game_over');
    assert.deepEqual(firstPlayerResults[firstPlayerResults.length - 1].payload, {
        winner: 'X',
        reason: 'win',
    });
    assert.deepEqual(secondPlayerResults[secondPlayerResults.length - 1].payload, {
        winner: 'X',
        reason: 'win',
    });

    const { server, firstPlayer: leaver, secondPlayer: remaining } = startMatch();
    server.disconnect(leaver);

    assert.deepEqual(remaining.received('game_over')[0].payload, {
        winner: 'O',
        reason: 'disconnect',
    });
});

test('declares a draw when all nine cells are filled without a winner', () => {
    const { firstPlayer, secondPlayer } = startMatch();
    const moves = [
        [firstPlayer, 0, 0],
        [secondPlayer, 0, 1],
        [firstPlayer, 0, 2],
        [secondPlayer, 1, 1],
        [firstPlayer, 1, 0],
        [secondPlayer, 1, 2],
        [firstPlayer, 2, 1],
        [secondPlayer, 2, 0],
        [firstPlayer, 2, 2],
    ];

    for (const [socket, row, col] of moves) {
        socket.send('make_move', { row, col });
    }

    const firstPlayerResults = firstPlayer.received('game_over');
    const secondPlayerResults = secondPlayer.received('game_over');
    assert.deepEqual(firstPlayerResults[0].payload, { winner: null, reason: 'draw' });
    assert.deepEqual(secondPlayerResults[0].payload, { winner: null, reason: 'draw' });
});
