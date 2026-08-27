import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { nanoid } from "nanoid";
import { registerUser, loginUser, saveMatch, getHistoryForUser } from "./db.js";
import { generateGrid } from "./gameUtils.js";
import { generateCrossword } from "./crosswordUtils.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN || "*" } // "*" en local; restringido en producción vía Railway
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
      gameState: null,
      currentGame: null
    });
    socket.join(code);
    callback({ code, role: "proposer" });
  });

  socket.on("join_room", ({ code, user }, callback) => {
    const room = rooms.get(code);
    if (!room) {
      return callback({ error: "Sala no encontrada" });
    }
    if (room.players.length >= 2) return callback({ error: "Sala llena" });

    const newPlayer = { socketId: socket.id, ...user, role: "guesser" };
    room.players.push(newPlayer);
    socket.join(code);
    callback({ ok: true, role: "guesser" });

    room.players.forEach((p) => {
      const opponent = room.players.find((pl) => pl.socketId !== p.socketId);
      io.to(p.socketId).emit("opponent_joined", { name: opponent.name });
    });
  });

  socket.on("select_game", ({ code, gameType }) => {
    const room = rooms.get(code);
    if (!room) return;
    room.currentGame = gameType;
    room.gameState = null;
    io.to(code).emit("game_selected", { gameType });
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

      await saveMatch({
        game_type: 'ahorcado',
        player1_id: proposerId,
        player2_id: guesserId,
        score1: proposerScore,
        score2: 0,
        winner_id: proposerId
      });

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

      await saveMatch({
        game_type: 'ahorcado',
        player1_id: proposerId,
        player2_id: guesserId,
        score1: 0,
        score2: guesserScore,
        winner_id: guesserId
      });

      room.players.forEach(p => {
          p.role = p.role === "proposer" ? "guesser" : "proposer";
          io.to(p.socketId).emit("roles_swapped", { role: p.role });
      });
      room.gameState = null;
    } else {
      io.to(code).emit("game_update", { mask, failedGuesses: room.gameState.failedGuesses });
    }
  });

  // Eventos de Sopa de Letras
  socket.on("start_sopa_round", ({ code, game_type }) => {
    const room = rooms.get(code);
    if (!room) return;

    const words = ["CACHORA", "AMOR", "JUEGO", "SOPA", "LETRAS", "REACT", "NODE", "SOCKET", "GATO", "PERRO", "PLAYA", "SOL", "LUNA", "ESTRELLA", "NUBE"].sort(() => 0.5 - Math.random()).slice(0, 10);
    const { grid, placedWords } = generateGrid(words);

    room.gameState = {
      type: "sopa_letras",
      grid,
      words: placedWords.map(p => ({ word: p.word, foundBy: null })),
      status: "playing",
      timer: 120
    };

    io.to(code).emit("sopa_started", { grid, words: room.gameState.words, timer: 60 });

    const interval = setInterval(() => {
      if (!rooms.has(code) || !rooms.get(code).gameState) {
        clearInterval(interval);
        return;
      }
      room.gameState.timer--;
      if (room.gameState.timer <= 0) {
        clearInterval(interval);
        endSopaRound(code);
      }
    }, 1000);
  });

  socket.on("submit_word_selection", ({ code, coordinates }) => {
    const room = rooms.get(code);
    if (!room || !room.gameState || room.gameState.type !== "sopa_letras") return;

    const selectedLetters = coordinates.map(c => room.gameState.grid[c.row][c.col]).join("");
    const wordIndex = room.gameState.words.findIndex(w => (w.word === selectedLetters || w.word === selectedLetters.split("").reverse().join("")) && !w.foundBy);

    if (wordIndex !== -1) {
      const player = room.players.find(p => p.socketId === socket.id);
      room.gameState.words[wordIndex].foundBy = player.name;
      room.gameState.words[wordIndex].userId = player.user_id;

      io.to(code).emit("word_claimed", { word: room.gameState.words[wordIndex].word, player: player.name });

      if (room.gameState.words.every(w => w.foundBy)) {
        endSopaRound(code);
      }
    }
  });

  async function endSopaRound(code) {
    const room = rooms.get(code);
    if (!room || !room.gameState) return;

    const scores = {};
    room.players.forEach(p => scores[p.user_id] = 0);
    room.gameState.words.forEach(w => {
      if (w.foundBy) {
        scores[w.userId] = (scores[w.userId] || 0) + (w.word.length * 10);
      }
    });

    const winnerId = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);

    await saveMatch({
      game_type: 'sopa_letras',
      player1_id: room.players[0].user_id,
      player2_id: room.players[1].user_id,
      score1: scores[room.players[0].user_id],
      score2: scores[room.players[1].user_id],
      winner_id: winnerId
    });

    io.to(code).emit("sopa_round_over", { scores, winnerId });
    room.gameState = null;
  }

  socket.on("get_history", async ({ user_id }, callback) => {
    const history = await getHistoryForUser(user_id);
    callback(history);
  });

  // Eventos de Crucigrama
  socket.on("start_crucigrama_round", ({ code }) => {
    const room = rooms.get(code);
    if (!room) return;

    const { grid, placedWords } = generateCrossword();
    room.gameState = {
      type: "crucigrama",
      grid,
      words: placedWords.map(w => ({ ...w, foundBy: null })),
      status: "playing"
    };

    io.to(code).emit("crucigrama_started", { 
        grid: grid.map(r => r.map(c => c ? { char: c.char, revealed: false } : null)), 
        pistas: placedWords.map(w => ({ number: w.number, clue: w.clue })) 
    });
  });

  socket.on("submit_crossword_answer", ({ code, number, answer }) => {
    const room = rooms.get(code);
    if (!room || !room.gameState || room.gameState.type !== "crucigrama") return;

    const wordObj = room.gameState.words.find(w => w.number === number && !w.foundBy);
    if (wordObj && wordObj.word === answer.toUpperCase()) {
      const player = room.players.find(p => p.socketId === socket.id);
      wordObj.foundBy = player.name;
      wordObj.userId = player.user_id;

      // Actualizar grid
      wordObj.word.split("").forEach((char, i) => {
        const r = wordObj.isHorizontal ? wordObj.row : wordObj.row + i;
        const c = wordObj.isHorizontal ? wordObj.col + i : wordObj.col;
        room.gameState.grid[r][c].revealed = true;
      });

      io.to(code).emit("clue_solved", { 
          number, 
          word: wordObj.word, 
          player: player.name,
          grid: room.gameState.grid
      });

      if (room.gameState.words.every(w => w.foundBy)) {
        endCrosswordRound(code);
      }
    }
  });

  async function endCrosswordRound(code) {
    const room = rooms.get(code);
    if (!room || !room.gameState) return;

    const scores = {};
    room.players.forEach(p => scores[p.user_id] = 0);
    room.gameState.words.forEach(w => {
      if (w.foundBy) {
        scores[w.userId] = (scores[w.userId] || 0) + (w.word.length * 10);
      }
    });

    const winnerId = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);

    await saveMatch({
      game_type: 'crucigrama',
      player1_id: room.players[0].user_id,
      player2_id: room.players[1].user_id,
      score1: scores[room.players[0].user_id],
      score2: scores[room.players[1].user_id],
      winner_id: winnerId
    });

    io.to(code).emit("crucigrama_round_over", { scores, winnerId });
    room.gameState = null;
  }

});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`Cachora server en :${PORT}`));