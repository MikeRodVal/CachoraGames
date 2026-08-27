#!/bin/bash
set -e

echo "🦎 Restaurando archivos base de Cachora Games..."

cat > package.json << 'EOF'
{
  "name": "cachora-games",
  "private": true,
  "workspaces": [
    "apps/*"
  ],
  "scripts": {
    "dev:server": "npm run dev --workspace=apps/server",
    "dev:client": "npm run dev --workspace=apps/client"
  }
}
EOF

cat > apps/server/package.json << 'EOF'
{
  "name": "cachora-server",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "node --watch src/index.js"
  },
  "dependencies": {
    "express": "^4.19.2",
    "socket.io": "^4.7.5",
    "nanoid": "^5.0.7",
    "bcryptjs": "^2.4.3",
    "@supabase/supabase-js": "^2.45.0",
    "dotenv": "^16.4.5"
  }
}
EOF

cat > apps/client/package.json << 'EOF'
{
  "name": "cachora-client",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "socket.io-client": "^4.7.5"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.0"
  }
}
EOF

cat > apps/client/vite.config.js << 'EOF'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()]
});
EOF

cat > apps/client/index.html << 'EOF'
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Cachora Games</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF

mkdir -p apps/client/src
cat > apps/client/src/main.jsx << 'EOF'
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
EOF

echo "✅ Archivos base restaurados."
echo "NOTA: index.js y GameScreen.jsx NO se tocaron porque ya sobrevivieron."
echo "Faltan por reconstruir: db.js, AuthScreen.jsx, App.jsx (versión con login), HistoryScreen.jsx"