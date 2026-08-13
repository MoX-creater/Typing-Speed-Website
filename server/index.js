require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { setupSocket } = require('./socketHandlers');
const firebaseAdmin = require('./firebaseAdmin');

const app = express();
const clientUrl = (process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173").trim();
app.use(cors({ origin: clientUrl, methods: ["GET", "POST"] }));
app.use(express.json());

const typingProfileRoutes = require("./routes/typingProfile");
const passagesRoutes = require("./routes/passages");
const racesRoutes = require("./routes/races");
const testsRoutes = require("./routes/tests");
app.use("/api", typingProfileRoutes);
app.use("/api", passagesRoutes);
app.use("/api", racesRoutes);
app.use("/api", testsRoutes);

// Create the HTTP server using Express
const server = http.createServer(app);

// Configure Socket.io with CORS to allow the frontend origin
const io = new Server(server, {
  cors: {
    origin: clientUrl,
    methods: ["GET", "POST"]
  }
});

// Initialize socket handlers
setupSocket(io);

// Basic route to check if server is running
app.get('/', (req, res) => {
  res.send('Socket.io server is running');
});

const PORT = Number(String(process.env.PORT || 5000).trim()) || 5000;
const FALLBACK_PORT = 5001;

function logStartup(port) {
  console.log(`Server listening on port ${port}`);
  console.log(`Allowed client origin: ${clientUrl}`);
  console.log(
    "API routes: POST /api/typing-profile, /api/passages/generate, /api/races/summary, /api/tests/summary"
  );
  if (port === FALLBACK_PORT) {
    console.warn(
      `Set VITE_SERVER_URL=http://localhost:${FALLBACK_PORT} in client/.env.local so the frontend hits this server.`
    );
  }
}

function startServer(port) {
  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && port === PORT) {
      console.warn(`Port ${port} is already in use (likely a stale server). Trying port ${FALLBACK_PORT}...`);
      startServer(FALLBACK_PORT);
      return;
    }
    throw error;
  });

  server.listen(port, () => logStartup(port));
}

startServer(PORT);
