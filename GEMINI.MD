# Cachora Games — Contexto del Proyecto

## Qué es
App web de mini juegos multijugador (empezando con sopa de letras) para que Luis    
y su pareja jueguen juntos desde el celular. Usa WebSockets en vez de apps nativas
para evitar el proceso de revisión de App Store.

## Arquitectura
- Monorepo con npm workspaces
- Sala persistente: Manejada por `Lobby.jsx`. Una vez unida la pareja, eligen juego desde el lobby (`select_game`) y el juego se renderiza dinámicamente (`GameScreen` o `SopaLetrasScreen`).
- Permite cambiar de juego sin salir de la sala.
- Estado del juego vive en el servidor (fuente de verdad), se transmite por eventos socket.

## Base de Datos (Supabase)
### Conexión
La base de datos está alojada en Supabase. Para conectar desde el servidor, se utilizan las siguientes variables de entorno en `apps/server/.env`:
- `SUPABASE_URL`: URL del proyecto de Supabase.
- `SUPABASE_KEY`: Clave API para inicializar el cliente `@supabase/supabase-js`.
- `DATABASE_URL`: URI de conexión directa a PostgreSQL (si es necesaria para herramientas directas).

### Tablas creadas (Migración: `apps/server/supabase/migrations/`)
- **`users`**:
  - `id` (UUID, PK, autogenerado): Identificador único del jugador.
  - `name` (TEXT, NOT NULL): Nombre visible del jugador.
  - `pin_hash` (TEXT, NOT NULL): Hash del PIN numérico para login simple.
  - `created_at` (TIMESTAMPTZ, DEFAULT now()): Fecha de creación.

- **`matches`**:
  - `id` (UUID, PK, autogenerado): Identificador de la partida.
  - `game_type` (TEXT, NOT NULL): Tipo de juego (ej. `sopa_letras`).
  - `player1_id` (UUID, FK -> `users.id`, ON DELETE CASCADE): Primer jugador.
  - `player2_id` (UUID, FK -> `users.id`, ON DELETE CASCADE): Segundo jugador.
  - `score1` (INT, NOT NULL, DEFAULT 0): Puntaje del jugador 1.
  - `score2` (INT, NOT NULL, DEFAULT 0): Puntaje del jugador 2.
  - `winner_id` (UUID, FK -> `users.id`, ON DELETE SET NULL, NULLABLE): Ganador de la partida.
  - `duration_seconds` (INT, NOT NULL, DEFAULT 0): Duración total en segundos.
  - `created_at` (TIMESTAMPTZ, DEFAULT now()): Fecha de finalización.

## Convenciones
- Prompts a Gemini deben ser cortos y enfocados (una tarea a la vez)
- Actualizar este archivo (GEMINI.md) al final de cada tarea completada
- Nombres de salas: código corto generado con nanoid

## Estado actual
- [x] Scaffold inicial (server + client + workspaces)
- [x] Esquema de base de datos inicial (Supabase: users, matches)
- [x] Lógica de autenticación (registro/login con bcrypt + Supabase + Socket.io)
- [x] Pantalla de login/registro en cliente con persistencia
- [x] Lógica de salas (crear/unirse) completa en cliente
- [x] Primer juego: Ahorcado completo
- [x] Segundo juego: Sopa de Letras completo (interacción por clics secuenciales)
- [x] Tercer juego: Crucigrama completo (numeración estándar, generación mejorada con reintentos)
- [x] Navegación: Lobby persistente y botón 'Salir de Sala' corregido
- [x] Historial de partidas y estadísticas (backend + frontend)
- [x] Roles alternados y funcionalidad de salir de sala
- [x] Persistencia de la palabra en historial de partidas
- [x] Reconstrucción de archivos perdidos (db.js, AuthScreen.jsx, App.jsx, HistoryScreen.jsx)
- [ ] Deploy (Railway/Render/Fly.io)
