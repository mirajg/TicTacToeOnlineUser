# Gridline — Online Tic-Tac-Toe

A real-time two-player tic-tac-toe game built with Next.js, Express, and Socket.IO.

## Project structure

- `frontend/app` — Next.js route, layout, and global styles
- `frontend/components/game` — interactive game screen
- `backend/config` — environment loading and validation
- `backend/game` — reusable tic-tac-toe rules
- `backend/sockets` — matchmaking and authoritative game events
- `backend/test` — game-rule tests

## Run locally

1. Copy `backend/.env.example` to `backend/.env`.
2. Copy `frontend/.env.example` to `frontend/.env.local`.
3. In `backend`, run `npm install` once and then `npm start`.
4. In `frontend`, run `npm install` once and then `npm run dev`.
5. Open `http://localhost:3000` in two browser windows to play.

The backend validates `SERVER_PORT` and `FRONTEND_URL` before starting. Set
`NEXT_PUBLIC_SOCKET_URL` in the frontend when the Socket.IO server is not at
`http://localhost:5000`.

## Tests

Run backend game-rule tests with `npm test` from `backend`.
 