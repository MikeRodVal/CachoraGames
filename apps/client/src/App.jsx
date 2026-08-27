import { useState, useEffect } from "react";
import AuthScreen from "./AuthScreen.jsx";
import GameScreen from "./GameScreen.jsx";
import HistoryScreen from "./HistoryScreen.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("game"); // "game" | "history"

  useEffect(() => {
    const user_id = localStorage.getItem("user_id");
    const user_name = localStorage.getItem("user_name");
    if (user_id && user_name) {
      setUser({ user_id, name: user_name });
    }
  }, []);

  const handleAuthSuccess = ({ user_id, name }) => {
    localStorage.setItem("user_id", user_id);
    localStorage.setItem("user_name", name);
    setUser({ user_id, name });
  };

  const handleLogout = () => {
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_name");
    setUser(null);
    setView("game");
  };

  if (!user) {
    return (
      <div style={{ fontFamily: "sans-serif" }}>
        <h1 style={{ textAlign: "center", marginTop: "40px" }}>Cachora Games</h1>
        <AuthScreen onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #ddd", paddingBottom: "12px", marginBottom: "20px" }}>
        <div>
          <span style={{ fontSize: "18px", fontWeight: "bold" }}>Cachora Games</span>
          <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#666" }}>Jugando como: <strong>{user.name}</strong></p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setView(view === "game" ? "history" : "game")}
            style={{ padding: "8px 12px", cursor: "pointer", backgroundColor: "#f0f0f0", border: "1px solid #ccc", borderRadius: "4px" }}
          >
            {view === "game" ? "Ver historial" : "Volver al juego"}
          </button>
          <button
            onClick={handleLogout}
            style={{ padding: "8px 12px", cursor: "pointer", backgroundColor: "#ff4d4f", color: "white", border: "none", borderRadius: "4px" }}
          >
            Salir
          </button>
        </div>
      </header>

      <main>
        {view === "game" ? (
          <GameScreen user={user} />
        ) : (
          <HistoryScreen user={user} />
        )}
      </main>
    </div>
  );
}
