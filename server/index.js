require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { setupSocket } = require('./socketHandlers');
const firebaseAdmin = require('./firebaseAdmin');

const app = express();
const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173";
app.use(cors({ origin: clientUrl, methods: ["GET", "POST"] }));

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

const PORT = process.env.PORT || 5000;

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.warn(`Port ${PORT} is already in use. Trying a fallback port...`);
    const fallbackPort = 5001;
    server.listen(fallbackPort, () => {
      console.log(`Server listening on port ${fallbackPort}`);
    });
    return;
  }

  throw error;
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Allowed client origin: ${clientUrl}`);
});
