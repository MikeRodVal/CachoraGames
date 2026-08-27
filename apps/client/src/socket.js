import { io } from "socket.io-client";

// Una sola conexión compartida por toda la app.
// En producción usa VITE_SERVER_URL (definida en Vercel); en desarrollo local usa localhost.
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

export const socket = io(SERVER_URL);