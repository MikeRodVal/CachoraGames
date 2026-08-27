import { useState, useEffect } from "react";
import { socket } from "./socket.js";

export default function GameScreen({ user }) {
  const [roomCode, setRoomCode] = useState(null);
  const [role, setRole] = useState(null); // "proposer" | "guesser" — rol ACTUAL/en vivo
  const [opponentName, setOpponentName] = useState(null);
  const [opponentJoined, setOpponentJoined] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joinError, setJoinError] = useState(null);
  const [wordInput, setWordInput] = useState("");
  const [gameState, setGameState] = useState(null); // { mask, failedGuesses }
  const [roundResult, setRoundResult] = useState(null); // { result, score, word, ... }
  const [roundRole, setRoundRole] = useState(null); // rol que tenías DURANTE la ronda que acaba de terminar
  const [letterInput, setLetterInput] = useState("");

  useEffect(() => {
    socket.on("opponent_joined", (data) => {
      setOpponentJoined(true);
      setOpponentName(data.name);
    });
    socket.on("game_started", (data) => setGameState({ mask: data.mask, failedGuesses: 0 }));
    socket.on("game_update", (data) => setGameState(data));
    socket.on("round_over", (data) => {
      setRoundRole(role); // congelamos el rol que tenías EN ESTA ronda, antes de que llegue el swap
      setRoundResult(data);
    });
    socket.on("roles_swapped", (data) => setRole(data.role));
    socket.on("player_left", () => {
      setOpponentJoined(false);
      setOpponentName(null);
    });
    return () => {
      socket.off("opponent_joined");
      socket.off("game_started");
      socket.off("game_update");
      socket.off("round_over");
      socket.off("roles_swapped");
      socket.off("player_left");
    };
  }, [role]);

  const createRoom = () => {
    socket.emit("create_room", { user }, (res) => {
      setRoomCode(res.code);
      setRole(res.role);
    });
  };

  const joinRoom = () => {
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) return;
    socket.emit("join_room", { code, user }, (res) => {
      if (res.error) {
        setJoinError(res.error);
        return;
      }
      setJoinError(null);
      setRoomCode(code);
      setRole(res.role);
    });
  };

  const leaveRoom = () => {
    if (roomCode) socket.emit("leave_room", { code: roomCode });
    setRoomCode(null);
    setRole(null);
    setOpponentName(null);
    setOpponentJoined(false);
    setGameState(null);
    setRoundResult(null);
    setRoundRole(null);
    setWordInput("");
  };

  const startRound = () => {
    if (!wordInput.trim()) return;
    socket.emit("start_round", { code: roomCode, word: wordInput.trim() });
  };

  const guess = (letter) => {
    if (!letter) return;
    socket.emit("guess_letter", { code: roomCode, letter });
    setLetterInput(""); // limpia el input después de cada letra
  };

  const nextRound = () => {
    setRoundResult(null);
    setRoundRole(null);
    setGameState(null);
    setWordInput("");
  };

  // --- Pantalla de resultado (usa roundRole, no role, para no mostrar el mensaje invertido) ---
  if (roundResult) {
    const guessed = roundResult.guessed;
    let title, points;

    if (roundRole === "guesser") {
      title = guessed ? "¡Ganaste!" : "Perdiste";
      points = roundResult.score ?? 0;
    } else {
      title = guessed
        ? `${opponentName ?? "Tu pareja"} adivinó`
        : `${opponentName ?? "Tu pareja"} no adivinó`;
      points = roundResult.proposerScore ?? 0;
    }

    return (
      <div>
        <h2>{title}</h2>
        <p>La palabra era: {roundResult.word}</p>
        {points > 0 && <p>Puntos: {points}</p>}
        <button onClick={nextRound}>Jugar otra ronda</button>
        <button onClick={leaveRoom} style={{ marginLeft: 8 }}>Salir</button>
      </div>
    );
  }

  // --- Lobby: crear o unirse a sala ---
  if (!roomCode) {
    return (
      <div>
        <button onClick={createRoom}>Crear Sala</button>

        <hr style={{ margin: "16px 0" }} />

        <p>¿Ya tienes un código?</p>
        <input
          maxLength={5}
          value={joinCodeInput}
          onChange={(e) => setJoinCodeInput(e.target.value)}
          placeholder="Código de sala"
        />
        <button onClick={joinRoom}>Unirse</button>
        {joinError && <p style={{ color: "red" }}>{joinError}</p>}
      </div>
    );
  }

  // --- Esperando a que se una el otro jugador ---
  if (!opponentJoined) {
    return (
      <div>
        <p>Sala: {roomCode}</p>
        <p>Esperando a que tu pareja se una con este código...</p>
        <button onClick={leaveRoom}>Salir</button>
      </div>
    );
  }

  // --- Antes de que arranque la ronda ---
  if (!gameState) {
    if (role === "proposer") {
      return (
        <div>
          <p>Sala: {roomCode}</p>
          <h2>¡Te toca elegir palabra!</h2>
          <input
            value={wordInput}
            onChange={(e) => setWordInput(e.target.value)}
            placeholder="Palabra secreta"
          />
          <button onClick={startRound}>Iniciar Ronda</button>
          <button onClick={leaveRoom} style={{ marginLeft: 8 }}>Salir</button>
        </div>
      );
    }
    return (
      <div>
        <p>Sala: {roomCode}</p>
        <p>{opponentName ?? "Tu pareja"} está eligiendo la palabra...</p>
        <button onClick={leaveRoom}>Salir</button>
      </div>
    );
  }

  // --- Proposer viendo el progreso (no puede escribir letras) ---
  if (role === "proposer") {
    return (
      <div>
        <p>Sala: {roomCode}</p>
        <h1>{gameState.mask}</h1>
        <p>Fallos: {gameState.failedGuesses} / 6</p>
        <p>{opponentName ?? "Tu pareja"} está adivinando...</p>
        <button onClick={leaveRoom}>Salir</button>
      </div>
    );
  }

  // --- Guesser adivinando letras ---
  return (
    <div>
      <p>Sala: {roomCode}</p>
      <h2>¡Te toca adivinar!</h2>
      <h1>{gameState.mask}</h1>
      <p>Fallos: {gameState.failedGuesses} / 6</p>
      <input
        maxLength={1}
        value={letterInput}
        onChange={(e) => guess(e.target.value)}
        placeholder="Letra"
      />
      <br />
      <button onClick={leaveRoom} style={{ marginTop: 8 }}>Salir</button>
    </div>
  );
}