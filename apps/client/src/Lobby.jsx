import { useState, useEffect } from "react";
import { socket } from "./socket.js";
import GameScreen from "./GameScreen.jsx";
import SopaLetrasScreen from "./SopaLetrasScreen.jsx";
import CrucigramaScreen from "./CrucigramaScreen.jsx";

export default function Lobby({ user, onLeave }) {
  const [roomCode, setRoomCode] = useState(null);
  const [role, setRole] = useState(null);
  const [opponentName, setOpponentName] = useState(null);
  const [opponentJoined, setOpponentJoined] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joinError, setJoinError] = useState(null);
  const [gameType, setGameType] = useState(null);

  useEffect(() => {
    socket.on("opponent_joined", (data) => {
      setOpponentJoined(true);
      setOpponentName(data.name);
    });
    socket.on("game_selected", (data) => setGameType(data.gameType));
    socket.on("player_left", () => {
      setOpponentJoined(false);
      setOpponentName(null);
      setGameType(null);
    });
    return () => {
      socket.off("opponent_joined");
      socket.off("game_selected");
      socket.off("player_left");
    };
  }, []);

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

  const selectGame = (type) => {
    socket.emit("select_game", { code: roomCode, gameType: type });
  };

  const leaveRoom = () => {
    if (roomCode) socket.emit("leave_room", { code: roomCode });
    setRoomCode(null);
    setRole(null);
    setOpponentName(null);
    setOpponentJoined(false);
    setGameType(null);
    setJoinCodeInput("");
    setJoinError(null);
    onLeave();
  };

  if (!roomCode) {
    return (
      <div>
        <button onClick={createRoom}>Crear Sala</button>
        <hr style={{ margin: "16px 0" }} />
        <p>¿Ya tienes un código?</p>
        <input value={joinCodeInput} onChange={(e) => setJoinCodeInput(e.target.value)} placeholder="Código de sala" />
        <button onClick={joinRoom}>Unirse</button>
        {joinError && <p style={{ color: "red" }}>{joinError}</p>}
        <button onClick={onLeave}>Volver</button>
      </div>
    );
  }

  if (!opponentJoined) {
    return (
      <div>
        <p>Sala: {roomCode}</p>
        <p>Esperando oponente...</p>
        <button onClick={leaveRoom}>Salir</button>
      </div>
    );
  }

  if (!gameType) {
    return (
      <div>
        <p>Sala: {roomCode} | Oponente: {opponentName}</p>
        <h2>Selecciona un juego:</h2>
        <button onClick={() => selectGame("ahorcado")}>Ahorcado</button>
        <button onClick={() => selectGame("sopa_letras")}>Sopa de Letras</button>
        <button onClick={() => selectGame("crucigrama")}>Crucigrama</button>
        <button onClick={leaveRoom}>Salir</button>
      </div>
    );
  }

  const commonProps = { user, roomCode, opponentName, initialRole: role, onBackToLobby: () => setGameType(null), onLeaveRoom: leaveRoom };
  if (gameType === "ahorcado") return <GameScreen {...commonProps} />;
  if (gameType === "sopa_letras") return <SopaLetrasScreen {...commonProps} />;
  return <CrucigramaScreen {...commonProps} />;
}
