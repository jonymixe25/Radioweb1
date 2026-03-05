import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import multer from "multer";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.resolve(__dirname, "uploads");
console.log("Uploads directory:", uploadsDir);
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit
  }
});

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
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
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
      if (!url.startsWith("http")) {
        return res.status(400).send("Solo se permiten URLs absolutas (http/https)");
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });
      
      clearTimeout(timeout);

      if (!response.ok) {
        return res.status(response.status).send(`Error de origen: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }

      // Stream the response instead of buffering it
      if (response.body) {
        // @ts-ignore - response.body is a ReadableStream in some environments, but we need it as a Node stream or similar
        // In Node 18+ fetch, response.body is a ReadableStream. We can convert it or use a different approach.
        // For simplicity and compatibility, we'll use arrayBuffer if streaming is tricky, 
        // but let's try to be more efficient.
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      } else {
        const arrayBuffer = await response.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));
      }
    } catch (error: any) {
      console.error("Proxy error:", error);
      res.status(500).send(`Error al obtener audio: ${error.message}`);
    }
  });

  app.post("/api/upload", (req, res) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err);
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "El archivo es demasiado grande (máximo 20MB)" });
        }
        return res.status(400).json({ error: err.message });
      }
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const url = `/uploads/${req.file.filename}`;
      console.log(`File uploaded successfully: ${req.file.filename} -> ${url}`);
      res.json({ url });
    });
  });

  app.use("/uploads", express.static(uploadsDir));

  // 404 for API routes to avoid falling through to Vite
  app.all("/api/*", (req, res) => {
    console.warn(`API Route not found: ${req.method} ${req.url}`);
    res.status(404).json({ error: `Ruta API no encontrada: ${req.method} ${req.url}` });
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
