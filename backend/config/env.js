
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({
    path: fileURLToPath(new URL('../.env', import.meta.url)),
});

if (!process.env.FRONTEND_URL?.trim()) {
    throw new Error('Missing required environment variable: FRONTEND_URL');
}

const serverPort = Number(process.env.PORT || process.env.SERVER_PORT || 5000);

if (!Number.isInteger(serverPort) || serverPort < 1 || serverPort > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
}

export const SERVER_PORT = serverPort;
export const FRONTEND_URL = process.env.FRONTEND_URL;