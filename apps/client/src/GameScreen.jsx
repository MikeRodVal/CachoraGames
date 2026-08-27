import { useState, useEffect } from "react";
import { socket } from "./socket.js";

export default function GameScreen({ user, roomCode, opponentName, onBackToLobby, onLeaveRoom }) {
  const [role, setRole] = useState(null); // "proposer" | "guesser"
  const [wordInput, setWordInput] = useState("");
  const [gameState, setGameState] = useState(null); // { mask, failedGuesses }
  const [roundResult, setRoundResult] = useState(null); // { result, score, word, ... }
  const [roundRole, setRoundRole] = useState(null);
  const [letterInput, setLetterInput] = useState("");

  useEffect(() => {
    socket.on("game_started", (data) => setGameState({ mask: data.mask, failedGuesses: 0 }));
    socket.on("game_update", (data) => setGameState(data));
    socket.on("round_over", (data) => {
      setRoundRole(role);
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
    setLetterInput("");
  };

  const nextRound = () => {
    setRoundResult(null);
    setRoundRole(null);
    setGameState(null);
    setWordInput("");
  };

  if (roundResult) {
    const guessed = roundResult.guessed;
    let title, points;

    if (roundRole === "guesser") {
      title = guessed ? "¡Ganaste!" : "Perdiste";
      points = roundResult.score ?? 0;
    } else {
      title = guessed ? `${opponentName} adivinó` : `${opponentName} no adivinó`;
      points = roundResult.proposerScore ?? 0;
    }

    return (
      <div>
        <h2>{title}</h2>
        <p>La palabra era: {roundResult.word}</p>
        {points > 0 && <p>Puntos: {points}</p>}
        <button onClick={nextRound}>Jugar otra ronda</button>
        <button onClick={onBackToLobby}>Cambiar de juego</button>
        <button onClick={onLeaveRoom}>Salir de sala</button>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div>
        <p>Sala: {roomCode} | Oponente: {opponentName}</p>
        <h2>Ahorcado - {role === "proposer" ? "Elige palabra" : "Esperando..."}</h2>
        {role === "proposer" && (
          <>
            <input value={wordInput} onChange={(e) => setWordInput(e.target.value)} placeholder="Palabra" />
            <button onClick={startRound}>Iniciar</button>
          </>
        )}
        <button onClick={onBackToLobby}>Cambiar de juego</button>
        <button onClick={onLeaveRoom}>Salir de sala</button>
      </div>
    );
  }

  return (
    <div>
      <p>Sala: {roomCode} | Oponente: {opponentName}</p>
      <h1>{gameState.mask}</h1>
      <p>Fallos: {gameState.failedGuesses} / 6</p>
      {role === "guesser" && (
        <input maxLength={1} value={letterInput} onChange={(e) => guess(e.target.value)} placeholder="Letra" />
      )}
      <button onClick={onBackToLobby}>Cambiar de juego</button>
      <button onClick={onLeaveRoom}>Salir de sala</button>
    </div>
  );
}