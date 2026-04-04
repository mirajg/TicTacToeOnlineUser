
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const port = 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

const server = http.createServer(app); // Wrap Express
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000", // Your frontend URL
        methods: ["GET", "POST"]
    }
});

app.get('/', (req, res) => {
    res.send('Hello World');
})

let usersList = [];
let roomNumber = 1;

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Listening for a custom event from client
    socket.on('join_game', (data) => {
        console.log(`User joined room: ${data}`);
        usersList.push({ id: socket.id, room: data });
        console.log(usersList);

        if (usersList.length % 2 === 0) {
            const roomName = `room-${roomNumber}`;
            const player1 = usersList[usersList.length - 2];
            const player2 = usersList[usersList.length - 1];
            io.to(player1.id).emit("game_start", { room: roomName, player: "X", isMyTurn: true, myId: player1.id, opponentId: player2.id });
            io.to(player2.id).emit("game_start", { room: roomName, player: "O", isMyTurn: false, myId: player2.id, opponentId: player1.id });
            roomNumber++;

            usersList = usersList.filter(user => user.id !== player1.id && user.id !== player2.id);

        }
    });

    socket.on("make_move", ({ row, col, player, opponentId }) => {
        io.to(opponentId).emit("opponent_move", { row, col, player });
    })

    socket.on("game_over_info_opponent", ({ text, myId, opponentId }) => {
        io.to(opponentId).emit("game_over_info", { text, myId, opponentId });
    });

    // Handling disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected');

        usersList = usersList.filter(user => user.id !== socket.id);
    });
});

server.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
})
