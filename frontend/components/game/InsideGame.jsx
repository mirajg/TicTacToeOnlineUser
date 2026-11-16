'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
const createEmptyBoard = () => Array(9).fill(null);

function getConnectionLabel(phase) {
    if (phase === 'connecting') return 'Connecting';
    if (phase === 'waiting') return 'Finding a player';
    if (phase === 'playing') return 'Live match';
    if (phase === 'finished') return 'Match complete';
    return 'Ready to play';
}

export default function InsideGame() {
    const [phase, setPhase] = useState('idle');
    const [board, setBoard] = useState(createEmptyBoard);
    const [player, setPlayer] = useState(null);
    const [currentTurn, setCurrentTurn] = useState(null);
    const [movePending, setMovePending] = useState(false);
    const [resultMessage, setResultMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const phaseRef = useRef('idle');
    const socketRef = useRef(null);
    const joinRequestedRef = useRef(false);
    const playerRef = useRef(null);
    const activeGameRef = useRef(false);

    const updatePhase = (nextPhase) => {
        phaseRef.current = nextPhase;
        setPhase(nextPhase);
    };

    useEffect(() => {
        const socket = io(SOCKET_URL, { autoConnect: false });
        socketRef.current = socket;

        const handleConnect = () => {
            setErrorMessage('');
            if (!joinRequestedRef.current) return;

            joinRequestedRef.current = false;
            updatePhase('waiting');
            socket.emit('join_game');
        };

        const handleConnectError = () => {
            joinRequestedRef.current = false;
            updatePhase('idle');
            setErrorMessage('Could not connect to the game server. Check your connection and try again.');
        };

        const handleDisconnect = (reason) => {
            if (reason === 'io client disconnect') return;

            joinRequestedRef.current = false;
            setMovePending(false);
            if (activeGameRef.current) {
                activeGameRef.current = false;
                setResultMessage('Connection lost. Start a new match when you are ready.');
                updatePhase('finished');
            } else if (phaseRef.current === 'waiting' || phaseRef.current === 'connecting') {
                setErrorMessage('Connection lost while finding a player. Please try again.');
                updatePhase('idle');
            }
        };

        const handleGameStart = ({ player: assignedPlayer }) => {
            setPlayer(assignedPlayer);
            playerRef.current = assignedPlayer;
            activeGameRef.current = true;
            setCurrentTurn('X');
            setBoard(createEmptyBoard());
            setMovePending(false);
            setResultMessage('');
            setErrorMessage('');
            updatePhase('playing');
        };

        const handleMoveMade = ({ row, col, player: movePlayer, nextPlayer }) => {
            setBoard((currentBoard) => {
                const nextBoard = [...currentBoard];
                nextBoard[row * 3 + col] = movePlayer;
                return nextBoard;
            });
            setCurrentTurn(nextPlayer);
            setMovePending(false);
            setErrorMessage('');
        };

        const handleMoveRejected = ({ message, board: serverBoard, currentPlayer }) => {
            if (Array.isArray(serverBoard) && serverBoard.length === 9) {
                setBoard(serverBoard);
                setCurrentTurn(currentPlayer);
            }
            setMovePending(false);
            setErrorMessage(message || 'That move could not be applied. Please try again.');
        };

        const handleGameOver = ({ winner, reason }) => {
            const message = reason === 'draw'
                ? 'A well-played draw.'
                : reason === 'disconnect'
                    ? 'Your opponent left the match. You win!'
                    : winner === playerRef.current
                        ? 'You win. Nicely played!'
                        : 'Your opponent wins this round.';

            setResultMessage(message);
            activeGameRef.current = false;
            setCurrentTurn(null);
            setMovePending(false);
            setErrorMessage('');
            updatePhase('finished');
        };

        socket.on('connect', handleConnect);
        socket.on('connect_error', handleConnectError);
        socket.on('disconnect', handleDisconnect);
        socket.on('game_start', handleGameStart);
        socket.on('move_made', handleMoveMade);
        socket.on('move_rejected', handleMoveRejected);
        socket.on('game_over', handleGameOver);

        return () => {
            joinRequestedRef.current = false;
            socket.off('connect', handleConnect);
            socket.off('connect_error', handleConnectError);
            socket.off('disconnect', handleDisconnect);
            socket.off('game_start', handleGameStart);
            socket.off('move_made', handleMoveMade);
            socket.off('move_rejected', handleMoveRejected);
            socket.off('game_over', handleGameOver);
            socket.disconnect();
            socketRef.current = null;
        };
    }, []);

    const findMatch = () => {
        const socket = socketRef.current;
        if (!socket) return;

        setBoard(createEmptyBoard());
        setPlayer(null);
        playerRef.current = null;
        setCurrentTurn(null);
        setMovePending(false);
        setResultMessage('');
        setErrorMessage('');
        joinRequestedRef.current = true;
        updatePhase('connecting');

        if (socket.connected) {
            joinRequestedRef.current = false;
            updatePhase('waiting');
            socket.emit('join_game');
        } else {
            socket.connect();
        }
    };

    const cancelSearch = () => {
        socketRef.current?.emit('leave_queue');
        updatePhase('idle');
        setErrorMessage('');
    };

    const makeMove = (index) => {
        const socket = socketRef.current;
        if (
            phase !== 'playing'
            || currentTurn !== player
            || board[index] !== null
            || movePending
            || !socket?.connected
        ) {
            return;
        }

        setMovePending(true);
        socket.emit('make_move', { row: Math.floor(index / 3), col: index % 3 });
    };

    const canMove = phase === 'playing' && currentTurn === player && !movePending;

    return (
        <main className="game-shell">
            <div className="ambient ambient--top" aria-hidden="true" />
            <div className="ambient ambient--bottom" aria-hidden="true" />

            <header className="topbar">
                <Link className="brand" href="/" aria-label="Gridline home">
                    <span className="brand-mark" aria-hidden="true">G</span>
                    <span>GAME<span className="brand-period">.</span></span>
                </Link>
                <div className={`connection-status connection-status--${phase}`} role="status">
                    <span className="connection-dot" aria-hidden="true" />
                    {getConnectionLabel(phase)}
                </div>
            </header>

            <div className="game-layout">
                <section className="intro" aria-labelledby="page-title">
                    <p className="eyebrow"><span /> THE CLASSIC, RECONNECTED</p>
                    <h1 id="page-title">Good moves.<br /><span>Good company.</span></h1>
                    <p className="intro-copy">
                        A little strategy goes a long way. Find a player and see who owns the grid.
                    </p>
                    <div className="feature-note">
                        <span className="feature-note__icon" aria-hidden="true">↗</span>
                        <span>Quick to learn. Better with a rival.</span>
                    </div>
                </section>

                <section className="game-card" aria-labelledby="game-title">
                    <div className="game-card__header">
                        <div>
                            <p className="card-kicker">ONLINE ARENA</p>
                            <h2 id="game-title">Tic-tac-toe</h2>
                        </div>
                        <span className="round-label">ONE ROUND</span>
                    </div>

                    {(phase === 'idle' || phase === 'connecting' || phase === 'waiting') && (
                        <div className="lobby">
                            <div className={`lobby-emblem${phase === 'waiting' ? ' lobby-emblem--searching' : ''}`} aria-hidden="true">
                                <span className="emblem-x">×</span>
                                <span className="emblem-o" />
                            </div>
                            <h3>
                                {phase === 'waiting'
                                    ? 'Your opponent is out there.'
                                    : phase === 'connecting'
                                        ? 'Warming up the board…'
                                        : 'Ready when you are.'}
                            </h3>
                            <p>
                                {phase === 'waiting'
                                    ? 'We’ll pair you as soon as another player joins.'
                                    : phase === 'connecting'
                                        ? 'Connecting to the game server.'
                                        : 'Jump into a live match with another player.'}
                            </p>
                            {phase === 'waiting' ? (
                                <button className="button button--quiet" onClick={cancelSearch} type="button">
                                    Cancel search
                                </button>
                            ) : (
                                <button
                                    className="button button--primary"
                                    disabled={phase === 'connecting'}
                                    onClick={findMatch}
                                    type="button"
                                >
                                    {phase === 'connecting' ? 'Connecting…' : 'Find a match'}
                                    <span aria-hidden="true">↗</span>
                                </button>
                            )}
                        </div>
                    )}

                    {(phase === 'playing' || phase === 'finished') && (
                        <div className="match">
                            <div className="players" aria-label="Players">
                                {['X', 'O'].map((mark) => (
                                    <div
                                        className={`player-card${player === mark ? ' player-card--you' : ''}${phase === 'playing' && currentTurn === mark ? ' player-card--active' : ''}`}
                                        key={mark}
                                    >
                                        <span className={`player-mark player-mark--${mark.toLowerCase()}`}>{mark}</span>
                                        <span className="player-details">
                                            <span className="player-name">{player === mark ? 'You' : 'Opponent'}</span>
                                            <span className="player-role">{mark === 'X' ? 'First move' : 'Second move'}</span>
                                        </span>
                                        {phase === 'playing' && currentTurn === mark && (
                                            <span className="turn-indicator">TURN</span>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <p className="turn-message" role="status" aria-live="polite">
                                {phase === 'finished'
                                    ? resultMessage
                                    : movePending
                                        ? 'Sending your move…'
                                        : currentTurn === player
                                            ? 'Your turn. Make it count.'
                                            : 'Opponent is thinking…'}
                            </p>

                            <div className={`board${canMove ? ' board--your-turn' : ''}`} role="group" aria-label="Tic-tac-toe board">
                                {board.map((mark, index) => {
                                    const row = Math.floor(index / 3) + 1;
                                    const col = (index % 3) + 1;

                                    return (
                                        <button
                                            aria-label={`Row ${row}, column ${col}${mark ? `, ${mark}` : ', empty'}`}
                                            className={`board-cell${mark ? ` board-cell--${mark.toLowerCase()}` : ''}`}
                                            disabled={!canMove || mark !== null}
                                            key={index}
                                            onClick={() => makeMove(index)}
                                            type="button"
                                        >
                                            {mark}
                                        </button>
                                    );
                                })}
                            </div>

                            {phase === 'finished' && (
                                <button className="button button--primary button--rematch" onClick={findMatch} type="button">
                                    Find another match
                                    <span aria-hidden="true">↗</span>
                                </button>
                            )}
                        </div>
                    )}

                    {errorMessage && <p className="error-message" role="alert">{errorMessage}</p>}

                    <div className="card-footer">
                        <span>MADE FOR THE LOVE OF THE GAME</span>
                        <span aria-hidden="true">3 × 3</span>
                    </div>
                </section>
            </div>

            <footer className="page-footer">
                <span>THINK AHEAD. PLAY FAIR.</span>
                <span>© GRIDLINE</span>
            </footer>
        </main>
    );
}
