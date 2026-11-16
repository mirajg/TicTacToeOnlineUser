import { getGameResult } from '../game/gameLogic.js';

export function registerGameHandlers(io) {
    const waitingPlayers = [];
    const games = new Map();
    const socketGames = new Map(); 
    let nextGameId = 1;

    const removeFromQueue = (socketId) => {
        const index = waitingPlayers.indexOf(socketId);
        if (index !== -1) waitingPlayers.splice(index, 1);
    };

    const finishGame = (gameId) => {
        const game = games.get(gameId);
        if (!game) return;

        games.delete(gameId);
        socketGames.delete(game.players.X);
        socketGames.delete(game.players.O);
    };

    const emitToGame = (game, event, payload) => {
        for (const socketId of Object.values(game.players)) {
            io.to(socketId).emit(event, payload);
        }
    };

    io.on('connection', (socket) => {
        socket.on('join_game', () => {
            if (socketGames.has(socket.id) || waitingPlayers.includes(socket.id)) return;

            let opponent;
            while (waitingPlayers.length > 0 && !opponent) {
                const opponentId = waitingPlayers.shift();
                const candidate = io.sockets.sockets.get(opponentId);

                if (candidate?.connected && !socketGames.has(opponentId)) {
                    opponent = candidate;
                }
            }

            if (!opponent) {
                waitingPlayers.push(socket.id);
                socket.emit('queue_waiting');
                return;
            }

            const gameId = `game-${nextGameId++}`;
            const game = {
                id: gameId,
                board: Array(9).fill(null),
                currentPlayer: 'X',
                players: { X: opponent.id, O: socket.id },
            };

            games.set(gameId, game);
            socketGames.set(opponent.id, gameId);
            socketGames.set(socket.id, gameId);

            io.to(opponent.id).emit('game_start', { room: gameId, player: 'X' });
            io.to(socket.id).emit('game_start', { room: gameId, player: 'O' });
        });

        socket.on('leave_queue', () => removeFromQueue(socket.id));

        socket.on('make_move', (move) => {
            const gameId = socketGames.get(socket.id);
            const game = games.get(gameId);
            const player = game?.players.X === socket.id
                ? 'X'
                : game?.players.O === socket.id
                    ? 'O'
                    : null;
            const row = move?.row;
            const col = move?.col;

            if (
                !game
                || player !== game.currentPlayer
                || !Number.isInteger(row)
                || !Number.isInteger(col)
                || row < 0
                || row > 2
                || col < 0
                || col > 2
                || game.board[row * 3 + col] !== null
            ) {
                socket.emit('move_rejected', {
                    message: 'That move is not available.',
                    board: game?.board ?? null,
                    currentPlayer: game?.currentPlayer ?? null,
                });
                return;
            }

            game.board[row * 3 + col] = player;
            const result = getGameResult(game.board);

            if (result) {
                emitToGame(game, 'move_made', { row, col, player, nextPlayer: null });
                emitToGame(game, 'game_over', result);
                finishGame(game.id);
                return;
            }

            game.currentPlayer = player === 'X' ? 'O' : 'X';
            emitToGame(game, 'move_made', {
                row,
                col,
                player,
                nextPlayer: game.currentPlayer,
            });
        });

        socket.on('disconnect', () => {
            removeFromQueue(socket.id);

            const gameId = socketGames.get(socket.id);
            const game = games.get(gameId);
            if (!game) return;

            const opponentId = game.players.X === socket.id ? game.players.O : game.players.X;
            const winner = game.players.X === opponentId ? 'X' : 'O';

            io.to(opponentId).emit('game_over', { winner, reason: 'disconnect' });
            finishGame(gameId);
        });
    });
}
