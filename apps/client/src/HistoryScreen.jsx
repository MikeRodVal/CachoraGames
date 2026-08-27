import { useState, useEffect } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

export default function HistoryScreen({ user }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.user_id) return;

    setLoading(true);
    socket.emit("get_history", { user_id: user.user_id }, (data) => {
      setHistory(data || []);
      setLoading(false);
    });
  }, [user]);

  // Calculate the accumulated total score
  const totalScore = history.reduce((acc, match) => {
    const isPlayer1 = match.player1_id === user.user_id;
    const userScore = isPlayer1 ? (match.score1 ?? 0) : (match.score2 ?? 0);
    return acc + userScore;
  }, 0);

  if (loading) {
    return <div style={{ textAlign: "center", padding: "20px" }}>Cargando historial...</div>;
  }

  return (
    <div>
      <h2 style={{ marginBottom: "16px" }}>Historial de Partidas</h2>
      
      <div style={{ backgroundColor: "#f9f9f9", padding: "12px 16px", borderRadius: "8px", marginBottom: "20px", border: "1px solid #eee" }}>
        <span style={{ fontSize: "16px" }}>Puntaje Total Acumulado:</span>
        <strong style={{ fontSize: "20px", color: "#0070f3", marginLeft: "10px" }}>{totalScore} pts</strong>
      </div>

      {history.length === 0 ? (
        <p style={{ color: "#666", textAlign: "center", padding: "20px" }}>Aún no has jugado ninguna partida.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {history.map((match) => {
            const isPlayer1 = match.player1_id === user.user_id;
            const userScore = isPlayer1 ? (match.score1 ?? 0) : (match.score2 ?? 0);
            const opponentScore = isPlayer1 ? (match.score2 ?? 0) : (match.score1 ?? 0);
            const didWin = match.winner_id === user.user_id;
            const matchDate = new Date(match.created_at).toLocaleDateString(undefined, {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={match.id}
                style={{
                  border: "1px solid #eee",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: didWin ? "#e6f4ea" : "#fdf6f6",
                }}
              >
                <div>
                  <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>{matchDate}</div>
                  <div style={{ fontSize: "16px", fontWeight: "bold" }}>
                    Juego: <span style={{ textTransform: "capitalize" }}>{match.game_type}</span>
                  </div>
                  {match.word && (
                    <div style={{ fontSize: "14px", marginTop: "4px" }}>
                      Palabra: <strong style={{ color: "#333" }}>{match.word}</strong>
                    </div>
                  )}
                </div>

                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "bold",
                      color: didWin ? "#137333" : "#c5221f",
                    }}
                  >
                    {didWin ? "Victoria" : "Derrota"}
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "bold", marginTop: "4px" }}>
                    +{userScore} pts
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
