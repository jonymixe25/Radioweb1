import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import path from "path";

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  // Store connected listeners
  const listeners = new Set<WebSocket>();
  let broadcaster: WebSocket | null = null;

  wss.on("connection", (ws) => {
    console.log("New connection");

    ws.on("message", (data, isBinary) => {
      // Handle messages
      try {
        if (!isBinary) {
          const message = JSON.parse(data.toString());
          if (message.type === "IDENTIFY_BROADCASTER") {
            broadcaster = ws;
            console.log("Broadcaster identified");
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
        console.log("Broadcaster disconnected");
      }
      listeners.delete(ws);
      console.log("Connection closed");
    });

    listeners.add(ws);
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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
