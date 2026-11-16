
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { FRONTEND_URL, SERVER_PORT } from './config/env.js';
import { registerGameHandlers } from './sockets/gameSocket.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

const server = http.createServer(app); // Wrap Express
const io = new Server(server, {
    cors: {
        origin: FRONTEND_URL,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    }
});

app.get('/', (req, res) => {
    res.send('Tic-Tac-Toe server is running.');
});

registerGameHandlers(io);

server.listen(SERVER_PORT, () => {
    console.log(`Example app listening on port ${SERVER_PORT}`);
})
