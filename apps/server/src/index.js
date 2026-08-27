import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { nanoid } from "nanoid";
import { registerUser, loginUser, saveMatch, getHistoryForUser } from "./db.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" } // TODO: restringir en producción
});

// Mapa de salas: code -> { players: [{socketId, user_id, name, role}], gameState: object }
const rooms = new Map();

io.on("connection", (socket) => {
  // Eventos de Autenticación / Registro
  socket.on("register", async (payload, callback) => {
    if (!payload || typeof callback !== "function") return;
    const { name, pin } = payload;
    const result = await registerUser(name, pin);
    callback(result);
  });

  socket.on("login", async (payload, callback) => {
    if (!payload || typeof callback !== "function") return;
    const { name, pin } = payload;
    const result = await loginUser(name, pin);
    callback(result);
  });

  // Eventos de Salas
  socket.on("create_room", ({ user }, callback) => {
    const code = nanoid(5).toUpperCase();
    rooms.set(code, {
      players: [{ socketId: socket.id, ...user, role: "proposer" }],
      gameState: null
    });
    socket.join(code);
    callback({ code, role: "proposer" });
  });

  socket.on("join_room", ({ code, user }, callback) => {
    const room = rooms.get(code);
    if (!room) return callback({ error: "Sala no encontrada" });
    if (room.players.length >= 2) return callback({ error: "Sala llena" });

    const newPlayer = { socketId: socket.id, ...user, role: "guesser" };
    room.players.push(newPlayer);
    socket.join(code);
    callback({ ok: true, role: "guesser" });

    // Avisamos a ambos que la sala ya está completa, cada quien recibe el nombre DEL OTRO
    room.players.forEach((p) => {
      const opponent = room.players.find((pl) => pl.socketId !== p.socketId);
      io.to(p.socketId).emit("opponent_joined", { name: opponent.name });
    });
  });

  // Eventos de Juego
  socket.on("start_round", ({ code, word }) => {
    const room = rooms.get(code);
    if (!room) return;

    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player || player.role !== "proposer") return; // solo el proposer puede iniciar

    room.gameState = {
      word: word.toLowerCase(),
      guessedLetters: new Set(),
      failedGuesses: 0,
      status: "playing",
      proposerId: room.players.find(p => p.role === "proposer").user_id,
      guesserId: room.players.find(p => p.role === "guesser").user_id
    };
    io.to(code).emit("game_started", { mask: Array(word.length).fill("_").join(" ") });
  });

  socket.on("guess_letter", async ({ code, letter }) => {
    const room = rooms.get(code);
    if (!room || !room.gameState || room.gameState.status !== "playing") return;

    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player || player.role !== "guesser") return; // solo el guesser puede adivinar

    const { word, guessedLetters, proposerId, guesserId } = room.gameState;
    const l = letter.toLowerCase();

    if (!guessedLetters.has(l)) {
      guessedLetters.add(l);
      if (!word.includes(l)) {
        room.gameState.failedGuesses++;
      }
    }

    const mask = word.split("").map((char) => guessedLetters.has(char) ? char : "_").join(" ");

    if (room.gameState.failedGuesses >= 6) {
      room.gameState.status = "lost";

      const uniqueLetters = new Set(word);
      const guessedUnique = new Set([...guessedLetters].filter(l => uniqueLetters.has(l)));
      const notGuessedCount = uniqueLetters.size - guessedUnique.size;
      const proposerScore = Math.round(100 * notGuessedCount / uniqueLetters.size);

      io.to(code).emit("round_over", {
          result: "lost",
          word,
          proposerScore,
          guesserScore: 0,
          guessed: false
      });

      // Guardar partida
      await saveMatch({
        game_type: 'ahorcado',
        player1_id: proposerId,
        player2_id: guesserId,
        score1: proposerScore,
        score2: 0,
        winner_id: proposerId
      });

      // Invertir roles y resetear para la siguiente ronda
      room.players.forEach(p => {
          p.role = p.role === "proposer" ? "guesser" : "proposer";
          io.to(p.socketId).emit("roles_swapped", { role: p.role });
      });
      room.gameState = null;
    } else if (!mask.includes("_")) {
      room.gameState.status = "won";
      const guesserScore = Math.max(0, 100 - room.gameState.failedGuesses * 15);

      io.to(code).emit("round_over", {
          result: "won",
          score: guesserScore,
          word,
          proposerScore: 0,
          guessed: true
      });

      // Guardar partida
      await saveMatch({
        game_type: 'ahorcado',
        player1_id: proposerId,
        player2_id: guesserId,
        score1: 0,
        score2: guesserScore,
        winner_id: guesserId
      });

      // Invertir roles y resetear para la siguiente ronda
      room.players.forEach(p => {
          p.role = p.role === "proposer" ? "guesser" : "proposer";
          io.to(p.socketId).emit("roles_swapped", { role: p.role });
      });
      room.gameState = null;
    } else {
      io.to(code).emit("game_update", { mask, failedGuesses: room.gameState.failedGuesses });
    }
  });

  socket.on("leave_room", ({ code }) => {
    const room = rooms.get(code);
    if (!room) return;

    room.players = room.players.filter(p => p.socketId !== socket.id);
    socket.leave(code);

    if (room.players.length === 0) {
      rooms.delete(code);
    } else {
      io.to(code).emit("player_left", { name: "Un jugador ha salido" });
    }
  });

  socket.on("get_history", async ({ user_id }, callback) => {
    const history = await getHistoryForUser(user_id);
    callback(history);
  });

  socket.on("disconnect", () => {
    // TODO: Limpiar salas
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`Cachora server en :${PORT}`));