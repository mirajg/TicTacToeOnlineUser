
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const requiredVariables = ['SERVER_PORT', 'FRONTEND_URL'];
const missingVariables = requiredVariables.filter((variable) => !process.env[variable]?.trim());

if (missingVariables.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missingVariables.join(', ')}`);
}

const serverPort = Number(process.env.SERVER_PORT);

if (!Number.isInteger(serverPort) || serverPort < 1 || serverPort > 65535) {
    throw new Error('SERVER_PORT must be an integer between 1 and 65535.');
}

export const SERVER_PORT = serverPort;
export const FRONTEND_URL = process.env.FRONTEND_URL;
