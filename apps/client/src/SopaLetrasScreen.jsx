import { useState, useEffect, useRef } from "react";
import { socket } from "./socket.js";

export default function SopaLetrasScreen({ user, roomCode, opponentName, onBackToLobby, onLeaveRoom }) {
  const [grid, setGrid] = useState(null);
  const [words, setWords] = useState([]);
  const [timer, setTimer] = useState(60);
  const [results, setResults] = useState(null);
  const [selection, setSelection] = useState([]);
  const gridRef = useRef(null);

  useEffect(() => {
    socket.emit("start_sopa_round", { code: roomCode, game_type: "sopa_letras" });
    
    socket.on("sopa_started", (data) => {
      setGrid(data.grid);
      setWords(data.words);
      setTimer(data.timer);
    });

    socket.on("word_claimed", (data) => {
      setWords(prev => prev.map(w => w.word === data.word ? { ...w, foundBy: data.player } : w));
    });

    socket.on("sopa_round_over", (data) => setResults(data));

    const interval = setInterval(() => setTimer(t => Math.max(0, t - 1)), 1000);
    return () => { clearInterval(interval); socket.off("sopa_started"); socket.off("word_claimed"); socket.off("sopa_round_over"); };
  }, [roomCode]);

  const toggleCell = (row, col) => {
    if (selection.find(s => s.row === row && s.col === col)) return;
    setSelection(prev => [...prev, { row, col }]);
  };

  const confirmWord = () => {
    socket.emit("submit_word_selection", { code: roomCode, coordinates: selection });
    setSelection([]);
  };

  const clearSelection = () => setSelection([]);

  if (results) {
    const myScore = results.scores[user.user_id] ?? 0;
    const opponentId = Object.keys(results.scores).find((id) => id !== String(user.user_id));
    const opponentScore = opponentId ? results.scores[opponentId] ?? 0 : 0;
    const iWon = String(results.winnerId) === String(user.user_id);
    const isTie = myScore === opponentScore;

    return (
      <div>
        <h2>{isTie ? "¡Empate!" : iWon ? "¡Ganaste!" : `${opponentName} ganó`}</h2>
        <p>Tú: <strong>{myScore} pts</strong></p>
        <p>{opponentName}: <strong>{opponentScore} pts</strong></p>
        <button onClick={() => { setResults(null); socket.emit("start_sopa_round", { code: roomCode }); }}>Jugar otra ronda</button>
        <button onClick={onBackToLobby}>Cambiar de juego</button>
        <button onClick={onLeaveRoom}>Salir de sala</button>
      </div>
    );
  }
  
  if (!grid) return <div>Cargando...</div>;

  return (
    <div>
      <p>Sala: {roomCode} | Oponente: {opponentName}</p>
      <p>Tiempo: {timer}s</p>
      <div 
        ref={gridRef}
        style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "2px", marginBottom: "16px" }}
      >
        {grid.map((row, r) => row.map((char, c) => (
          <div 
            key={`${r}-${c}`}
            onClick={() => toggleCell(r, c)}
            style={{ width: "25px", height: "25px", border: "1px solid #ccc", display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer", background: selection.find(s => s.row === r && s.col === c) ? "#add8e6" : "white" }}
          >{char}</div>
        )))}
      </div>
      <div>
        <button onClick={confirmWord}>Confirmar palabra</button>
        <button onClick={clearSelection}>Limpiar</button>
      </div>
      <div>
        {words.map(w => (
          <div key={w.word} style={{ textDecoration: w.foundBy ? "line-through" : "none" }}>
            {w.word} {w.foundBy ? `(${w.foundBy})` : ""}
          </div>
        ))}
      </div>
      <button onClick={onBackToLobby} style={{ marginTop: "16px" }}>Cambiar de juego</button>
      <button onClick={onLeaveRoom} style={{ marginTop: "16px", marginLeft: 8 }}>Salir de sala</button>
    </div>
  );
}
