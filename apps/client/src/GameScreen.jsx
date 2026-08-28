import { useState, useEffect } from "react";
import { socket } from "./socket.js";

export default function GameScreen({ user, roomCode, opponentName, initialRole, onBackToLobby, onLeaveRoom }) {
  const [role, setRole] = useState(initialRole ?? null); // "proposer" | "guesser" — rol ACTUAL/en vivo
  const [wordInput, setWordInput] = useState("");
  const [gameState, setGameState] = useState(null); // { mask, failedGuesses }
  const [roundResult, setRoundResult] = useState(null); // { result, score, word, ... }
  const [roundRole, setRoundRole] = useState(null); // rol que tenías DURANTE la ronda que acaba de terminar
  const [letterInput, setLetterInput] = useState("");

  // Si Lobby nos pasa un initialRole distinto (ej. al re-entrar), lo tomamos
  useEffect(() => {
    if (initialRole) setRole(initialRole);
  }, [initialRole]);

  useEffect(() => {
    socket.on("game_started", (data) => setGameState({ mask: data.mask, failedGuesses: 0 }));
    socket.on("game_update", (data) => setGameState(data));
    socket.on("round_over", (data) => {
      setRoundRole(role); // congelamos el rol que tenías EN ESTA ronda, antes de que llegue el swap
      setRoundResult(data);
    });
    socket.on("roles_swapped", (data) => setRole(data.role));
    return () => {
      socket.off("game_started");
      socket.off("game_update");
      socket.off("round_over");
      socket.off("roles_swapped");
    };
  }, [role]);

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
        <button onClick={onBackToLobby} style={{ marginLeft: 8 }}>Cambiar de juego</button>
        <button onClick={onLeaveRoom} style={{ marginLeft: 8 }}>Salir</button>
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
          <button onClick={onBackToLobby} style={{ marginLeft: 8 }}>Cambiar de juego</button>
          <button onClick={onLeaveRoom} style={{ marginLeft: 8 }}>Salir</button>
        </div>
      );
    }
    return (
      <div>
        <p>Sala: {roomCode}</p>
        <p>{opponentName ?? "Tu pareja"} está eligiendo la palabra...</p>
        <button onClick={onBackToLobby}>Cambiar de juego</button>
        <button onClick={onLeaveRoom} style={{ marginLeft: 8 }}>Salir</button>
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
        <button onClick={onLeaveRoom}>Salir</button>
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
      <button onClick={onLeaveRoom} style={{ marginTop: 8 }}>Salir</button>
    </div>
  );
}