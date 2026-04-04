
"use client"
import React, { useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client';

const InsideGame = () => {
    const [isStart, setIsStart] = useState(false);
    const [isJoined, setIsJoined] = useState(false);
    const [player, setPlayer] = useState("");
    const [isMyTurn, setIsMyTurn] = useState(null);
    const [myId, setMyId] = useState("");
    const [opponentId, setOpponentId] = useState("");

    const socketRef = useRef(null);
    const [board, setBoard] = useState([
        ["", "", ""],
        ["", "", ""],
        ["", "", ""]
    ]);

    const winConditions = [
        // Horizontal rows
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],

        // Vertical columns
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],

        // Diagonals
        [0, 4, 8],
        [2, 4, 6]
    ];

    useEffect(() => {
        socketRef.current = io("http://localhost:5000", { autoConnect: false });

        socketRef.current.on("connect", () => {
            socketRef.current.emit("join_game", null);
        });

        socketRef.current.on("game_start", ({ roomName, player, isMyTurn, myId, opponentId }) => {
            console.log(`Game started in room: ${roomName} as player: ${player}`);
            setPlayer(player);
            setIsMyTurn(isMyTurn);
            setIsJoined(true);
            setMyId(myId);
            setOpponentId(opponentId);
        })

        socketRef.current.on("opponent_move", ({ row, col, player }) => {

            setBoard(prevBoard => {
                return prevBoard.map((r, rIdx) => {
                    if (rIdx === row) {
                        const newRow = [...r]; // Copy the specific row
                        newRow[col] = player;  // Update the cell
                        return newRow;
                    }
                    return r; // Leave other rows alone
                });
            });
            setIsMyTurn(true);
        })

        socketRef.current.on("game_over_info", ({ text }) => {

            setIsStart(false);
            setIsJoined(false);
            setBoard([
                ["", "", ""],
                ["", "", ""],
                ["", "", ""]
            ]);
            setPlayer("");
            setIsMyTurn(null);
            setMyId("");
            setOpponentId("");
            socketRef.current.disconnect();

            alert(text);
        })

        return () => {
            if (socketRef.current) {
                socketRef.current.off("game_start");
                socketRef.current.off("connect");
                socketRef.current.off("opponent_move");
                socketRef.current.off("game_over_info");
            }
        };
    }, []);

    const startGame = async () => {

        if (!socketRef.current.connected) {
            socketRef.current.connect(); // Manually connect when the user clicks "Start"
        }

        setIsStart(true);

    }

    const handleWinCheck = (currentBoard) => {
        let flatBoard = currentBoard.flat(); // Flatten the 2D board into a 1D array for easier indexing

        for (let i in winConditions) {
            const [a, b, c] = winConditions[i];

            if (flatBoard[a] !== "" && flatBoard[a] === flatBoard[b] && flatBoard[a] === flatBoard[c]) {

                socketRef.current.emit("game_over_info_opponent", { text: `Player ${flatBoard[a]} wins!`, myId: myId, opponentId: opponentId });

                setIsStart(false);
                setIsJoined(false);
                setBoard([
                    ["", "", ""],
                    ["", "", ""],
                    ["", "", ""]
                ]);
                setPlayer("");
                setIsMyTurn(null);
                setMyId("");
                setOpponentId("");
                socketRef.current.disconnect();

                alert(`Player ${flatBoard[a]} wins!`);

                return;
            }
        }

        // condition for draw
        if (flatBoard.every(cell => cell != "")) {
            alert("It's a draw!");
        }

    }

    const handleClick = (rowIndex, colIndex) => {
        if (!isMyTurn || board[rowIndex][colIndex] !== "") return;

        const newBoard = [...board];
        newBoard[rowIndex][colIndex] = player; // "X" or "O"
        setBoard(newBoard);

        // 3. Update Turn
        setIsMyTurn(false);

        handleWinCheck(newBoard);

        // 4. Emit to server
        // Note: Use a stable socket reference (like from a ref or context)
        socketRef.current.emit("make_move", {
            row: rowIndex,
            col: colIndex,
            player: player,
            myId: myId,
            opponentId: opponentId,
        });


    }


    return (

        <div>
            {isStart ? (
                <>
                    {isJoined ? (
                        <>
                            <div className='w-full  h-screen flex items-center flex-col justify-center'>
                                {board.map((row, rIdx) => (
                                    <div key={rIdx} className="flex">
                                        {row.map((cell, cIdx) => (

                                            <button
                                                key={cIdx}
                                                onClick={() => handleClick(rIdx, cIdx)}
                                                className={`w-24 h-24 border-2 border-gray-500 flex items-center justify-center text-2xl cursor-pointer`}
                                            >
                                                {cell}
                                            </button>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            <p>Wait for another player to join...</p>
                        </>
                    )}
                </>
            ) : (
                <div className="w-full min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-neutral-100">
                    {/* Background Graphic Grid Hint */}
                    <div className="absolute inset-0 z-0 opacity-10"
                        style={{ backgroundImage: 'linear-gradient(#262626 1px, transparent 1px), linear-gradient(90deg, #262626 1px, transparent 1px)', backgroundSize: '40px 40px' }}
                    />

                    <div className="z-10 flex flex-col items-center gap-10 text-center max-w-2xl">

                        <div className="space-y-3">
                            <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-neutral-200 to-neutral-500">
                                Awaiting Challenger
                            </h1>
                            <p className="text-xl text-neutral-400 max-w-lg mx-auto">
                                The arena is set. The moves are plotted. Are you ready to claim the grid? Start the match whenever you're prepared.
                            </p>
                        </div>

                        <button
                            onClick={() => startGame()}
                        >

                            <span className="relative text-xl uppercase tracking-widest text-amber-400 group-hover:text-black transition-colors duration-200">
                                Start Match
                            </span>
                        </button>
                    </div>
                </div>
            )
            }
        </div >
    )
}

export default InsideGame