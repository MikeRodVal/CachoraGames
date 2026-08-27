import { useState } from "react";
import { socket } from "./socket.js";

export default function AuthScreen({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedPin = pin.trim();

    if (!trimmedName || !trimmedPin) {
      setError("Por favor completa todos los campos.");
      return;
    }

    setLoading(true);

    const eventName = isLogin ? "login" : "register";
    const payload = { name: trimmedName, pin: trimmedPin };

    socket.emit(eventName, payload, (res) => {
      setLoading(false);
      if (res.error) {
        setError(res.error);
      } else if (res.success && res.user) {
        onAuthSuccess({ user_id: res.user.id, name: res.user.name });
      } else {
        setError("Ocurrió un error inesperado.");
      }
    });
  };

  return (
    <div style={{ maxWidth: "320px", margin: "40px auto", padding: "20px", border: "1px solid #ccc", borderRadius: "8px" }}>
      <h2 style={{ textAlign: "center" }}>{isLogin ? "Iniciar Sesión" : "Registrarse"}</h2>
      
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div>
          <label style={{ display: "block", marginBottom: "4px" }}>Nombre:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
            placeholder="Tu nombre"
            disabled={loading}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "4px" }}>PIN (Numérico):</label>
          <input
            type="password"
            pattern="[0-9]*"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
            placeholder="Ej. 1234"
            disabled={loading}
          />
        </div>

        {error && <p style={{ color: "red", margin: "0", fontSize: "14px" }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ padding: "10px", backgroundColor: "#0070f3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
          {loading ? "Cargando..." : isLogin ? "Entrar" : "Crear Cuenta"}
        </button>
      </form>

      <div style={{ marginTop: "16px", textAlign: "center" }}>
        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setError(null);
          }}
          style={{ background: "none", border: "none", color: "#0070f3", cursor: "pointer", textDecoration: "underline" }}
          disabled={loading}
        >
          {isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia Sesión"}
        </button>
      </div>
    </div>
  );
}
