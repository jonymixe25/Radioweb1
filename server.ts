import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import path from "path";
import Database from "better-sqlite3";

const db = new Database("radio.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS playlists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS songs (
    id TEXT PRIMARY KEY,
    playlist_id TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    url TEXT NOT NULL,
    FOREIGN KEY (playlist_id) REFERENCES playlists (id) ON DELETE CASCADE
  );
`);

async function startServer() {
  const app = express();
  app.use(express.json());
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  // Store connected listeners
  const listeners = new Set<WebSocket>();
  let broadcaster: WebSocket | null = null;

  wss.on("connection", (ws) => {
    console.log("Nueva conexión");

    ws.on("message", (data, isBinary) => {
      // Handle messages
      try {
        if (!isBinary) {
          const message = JSON.parse(data.toString());
          if (message.type === "IDENTIFY_BROADCASTER") {
            broadcaster = ws;
            console.log("Locutor identificado");
          }
          return;
        }

        // If it's binary data (audio chunks) and from the broadcaster, broadcast to listeners
        if (ws === broadcaster) {
          listeners.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(data, { binary: true });
            }
          });
        }
      } catch (e) {
        // Fallback for raw binary data if not JSON
        if (ws === broadcaster) {
          listeners.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(data, { binary: true });
            }
          });
        }
      }
    });

    ws.on("close", () => {
      if (ws === broadcaster) {
        broadcaster = null;
        console.log("Locutor desconectado");
      }
      listeners.delete(ws);
      console.log("Conexión cerrada");
    });

    listeners.add(ws);
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/playlists", (req, res) => {
    const playlists = db.prepare("SELECT * FROM playlists").all();
    const result = playlists.map((p: any) => ({
      ...p,
      songs: db.prepare("SELECT * FROM songs WHERE playlist_id = ?").all(p.id)
    }));
    res.json(result);
  });

  app.post("/api/playlists", (req, res) => {
    const { id, name } = req.body;
    db.prepare("INSERT INTO playlists (id, name) VALUES (?, ?)").run(id, name);
    res.json({ success: true });
  });

  app.delete("/api/playlists/:id", (req, res) => {
    db.prepare("DELETE FROM playlists WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/playlists/:id/songs", (req, res) => {
    const { id: songId, title, artist, url } = req.body;
    const playlistId = req.params.id;
    db.prepare("INSERT INTO songs (id, playlist_id, title, artist, url) VALUES (?, ?, ?, ?, ?)").run(
      songId, playlistId, title, artist, url
    );
    res.json({ success: true });
  });

  app.delete("/api/playlists/:id/songs/:songId", (req, res) => {
    db.prepare("DELETE FROM songs WHERE id = ? AND playlist_id = ?").run(
      req.params.songId, req.params.id
    );
    res.json({ success: true });
  });

  app.get("/api/proxy-audio", async (req, res) => {
    const url = req.query.url as string;
    if (!url) {
      return res.status(400).send("URL is required");
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }

      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(500).send("Error fetching audio");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
