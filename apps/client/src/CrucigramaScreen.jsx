import { useState, useEffect } from "react";
import { socket } from "./socket.js";

export default function CrucigramaScreen({ user, roomCode, opponentName, onBackToLobby, onLeaveRoom }) {
  const [grid, setGrid] = useState(null);
  const [pistas, setPistas] = useState([]);
  const [results, setResults] = useState(null);
  const [answerInputs, setAnswerInputs] = useState({});

  useEffect(() => {
    socket.emit("start_crucigrama_round", { code: roomCode });
    socket.on("crucigrama_started", (data) => { setGrid(data.grid); setPistas(data.pistas); });
    socket.on("clue_solved", (data) => { setGrid(data.grid); setPistas(data.pistas); });
    socket.on("crucigrama_round_over", (data) => setResults(data));
    return () => { socket.off("crucigrama_started"); socket.off("clue_solved"); socket.off("crucigrama_round_over"); };
  }, [roomCode]);

  const submitAnswer = (number) => {
    socket.emit("submit_crossword_answer", { code: roomCode, number, answer: answerInputs[number] });
  };

  if (results) return (
    <div>
      <h2>Resultados</h2>
      <pre>{JSON.stringify(results, null, 2)}</pre>
      <button onClick={() => { setResults(null); socket.emit("start_crucigrama_round", { code: roomCode }); }}>Jugar otra ronda</button>
      <button onClick={onBackToLobby}>Cambiar de juego</button>
      <button onClick={onLeaveRoom}>Salir de sala</button>
    </div>
  );

  if (!grid) return <div>Cargando...</div>;

  return (
    <div>
      <p>Sala: {roomCode} | Oponente: {opponentName}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(13, 25px)", marginBottom: "20px" }}>
        {grid.map((row, r) => row.map((cell, c) => (
          <div key={`${r}-${c}`} style={{ width: "25px", height: "25px", border: "1px solid #000", background: cell ? (cell.revealed ? "#fff" : "#eee") : "#000" }}>
            {cell?.revealed ? cell.char : ""}
          </div>
        )))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        {pistas.map(p => {
          const isSolved = !!pistas.find(pista => pista.number === p.number)?.foundBy;
          return (
            <div key={p.number} style={{ marginBottom: "10px", border: "1px solid #ccc", padding: "5px" }}>
              <strong>{p.number}.</strong> {p.clue} <span style={{ fontSize: "12px", color: "#666" }}>({p.length} letras)</span>
              <br />
              <input 
                value={answerInputs[p.number] || ""} 
                onChange={(e) => setAnswerInputs(prev => ({ ...prev, [p.number]: e.target.value }))}
                disabled={isSolved}
              />
              <button 
                onClick={() => submitAnswer(p.number)}
                disabled={isSolved}
              >Responder</button>
            </div>
          );
        })}
      </div>
      <button onClick={onBackToLobby} style={{ marginTop: "20px" }}>Cambiar de juego</button>
      <button onClick={onLeaveRoom} style={{ marginTop: "20px", marginLeft: 8 }}>Salir de sala</button>
    </div>
  );
}
