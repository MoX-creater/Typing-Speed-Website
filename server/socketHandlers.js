/**
 * socketHandlers.js
 * -----------------
 * Phase 1+2 — Room management and live race.
 *
 * Exports `setupSocket(io)` to be called once from the main server file.
 * All room state is kept in-memory; it resets when the server restarts.
 *
 * Room shape:
 *   Map<roomId, {
 *     roomId      : string,
 *     hostSocketId: string,
 *     players     : Array<{ socketId, userId, username, ready,
 *                           progress, wpm, finished, finalWpm,
 *                           finalAccuracy, finishTime }>,
 *     passage     : string | null,
 *     status      : 'waiting' | 'racing' | 'finished',
 *     startTime   : number | null   // ms epoch when typing begins (after countdown)
 *   }>
 */

// ---------------------------------------------------------------------------
// Passages (used in Phase 2 — picked at random when a race starts)
// ---------------------------------------------------------------------------

const PASSAGES = [
  'The quick brown fox jumps over the lazy dog near the riverbank where wildflowers bloom in the golden light of a summer afternoon',
  'Programming is the art of telling another human being what one wants the computer to do in a language both can understand clearly',
  'Technology is best when it brings people together and empowers them to create things that were previously impossible to imagine',
  'Every great developer you know got there by solving problems they were unqualified to solve until they actually did it themselves',
  'The only way to learn a new programming language is by writing programs in it and making mistakes along the way forward',
  'In the middle of difficulty lies opportunity and those who embrace challenges find themselves growing stronger each day ahead',
  'Success is not final and failure is not fatal it is the courage to continue that counts in the journey of life and work',
  'The best error message is the one that never shows up because the developer anticipated every possible edge case beforehand',
  'Code is like humor when you have to explain it then it is probably not that good and needs to be rewritten from scratch',
  'Simplicity is the soul of efficiency and the mark of a truly great engineer who understands the value of clean design',
  'First solve the problem then write the code because understanding the problem is more than half the battle in software',
  'Any fool can write code that a computer can understand but good programmers write code that humans can understand easily',
];

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------

/**
 * Primary room store keyed by roomId (the human-friendly code).
 * @type {Map<string, object>}
 */
const rooms = new Map();

/**
 * Reverse lookup: socketId → roomId.
 * Required because the 'disconnect' event carries no room context.
 * @type {Map<string, string>}
 */
const socketToRoom = new Map();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_PLAYERS = 6;

/**
 * Generates a short, human-friendly room code.
 * Avoids visually ambiguous characters: 0, O, 1, I.
 * Example output: "A3KX7M"
 * @returns {string} 6-character uppercase alphanumeric code
 */
function generateRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

/**
 * Generates a unique room code that doesn't collide with any existing room.
 * @returns {string}
 */
function generateUniqueRoomCode() {
  let code = generateRoomCode();
  while (rooms.has(code)) {
    code = generateRoomCode();
  }
  return code;
}

/**
 * Returns a deep-enough snapshot of a room safe to emit over the wire.
 * Returns null if the room doesn't exist.
 * @param {string} roomId
 * @returns {{ roomId: string, room: object } | null}
 */
function getRoomSnapshot(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;

  return {
    roomId,
    room: {
      ...room,
      players: room.players.map((p) => ({ ...p })),
    },
  };
}

/**
 * Broadcasts the current room state to every socket in that Socket.io room.
 * Emits the 'room_updated' event with a room snapshot as payload.
 * @param {import('socket.io').Server} io
 * @param {string} roomId
 */
function broadcastRoomUpdate(io, roomId) {
  const snapshot = getRoomSnapshot(roomId);
  if (!snapshot) return;
  io.to(roomId).emit('room_updated', snapshot);
}

/**
 * Removes a player from the room, handles host reassignment, and cleans up
 * the socketToRoom lookup.
 *
 * Returns:
 *   - { deleted: true,  roomId } — room was empty and has been deleted
 *   - { deleted: false, roomId } — player removed, room still active
 *   - null                       — socket wasn't tracked in any room
 *
 * @param {string} socketId
 * @param {string} roomId
 * @returns {{ deleted: boolean, roomId: string } | null}
 */
function removePlayerFromRoom(socketId, roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;

  // Remove the player from the players array
  room.players = room.players.filter((p) => p.socketId !== socketId);

  // Clean up the reverse-lookup immediately
  socketToRoom.delete(socketId);

  // If room is now empty, delete it entirely
  if (room.players.length === 0) {
    rooms.delete(roomId);
    return { deleted: true, roomId };
  }

  // If the departing player was host, promote the next player in line
  if (room.hostSocketId === socketId) {
    room.hostSocketId = room.players[0].socketId;
  }

  return { deleted: false, roomId };
}

// ---------------------------------------------------------------------------
// Main setup function — call once from index.js
// ---------------------------------------------------------------------------

/**
 * Attaches all Socket.io event handlers to the given server instance.
 * Call this once after creating the `io` server:
 *
 *   const { setupSocket } = require('./socketHandlers');
 *   setupSocket(io);
 *
 * @param {import('socket.io').Server} io
 */
function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    // -----------------------------------------------------------------------
    // create_room
    // Client sends: { username: string, userId: string }
    // Server: generates a unique room code, creates the room with this player
    //         as host, joins the Socket.io room, and responds with
    //         'room_created' carrying the room id and initial state.
    // -----------------------------------------------------------------------
    socket.on('create_room', ({ username, userId }) => {
      const roomId = generateUniqueRoomCode();

      const room = {
        roomId,
        hostSocketId: socket.id,
        players: [
          {
            socketId: socket.id,
            userId,
            username,
            ready: false,
          },
        ],
        passage: null,   // populated in Phase 2
        status: 'waiting',
        startTime: null, // populated in Phase 2
      };

      rooms.set(roomId, room);
      socketToRoom.set(socket.id, roomId);
      socket.join(roomId);

      console.log(`[socket] ${username} (${socket.id}) created room ${roomId}`);
      socket.emit('room_created', getRoomSnapshot(roomId));
    });

    // -----------------------------------------------------------------------
    // join_room
    // Client sends: { roomId: string, username: string, userId: string }
    // Server: validates the room exists, isn't already racing, and isn't full.
    //         Adds the player and broadcasts 'room_updated' to everyone in the
    //         room (including the new joiner, who has just joined the Socket.io
    //         room via socket.join()).
    //
    // Emits 'room_error' with a message for:
    //   - Room not found
    //   - Race already in progress
    //   - Room at capacity (MAX_PLAYERS)
    // -----------------------------------------------------------------------
    socket.on('join_room', ({ roomId, username, userId }) => {
      // Normalise input: trim whitespace and uppercase so "a3kx7m" also works
      const normalizedId = roomId ? roomId.trim().toUpperCase() : null;
      const room = normalizedId ? rooms.get(normalizedId) : null;

      if (!room) {
        socket.emit('room_error', { message: 'Room not found. Check the code and try again.' });
        return;
      }

      if (room.status !== 'waiting') {
        socket.emit('room_error', { message: 'That race has already started.' });
        return;
      }

      if (room.players.length >= MAX_PLAYERS) {
        socket.emit('room_error', { message: `Room is full (max ${MAX_PLAYERS} players).` });
        return;
      }

      const player = {
        socketId: socket.id,
        userId,
        username,
        ready: false,
      };

      room.players.push(player);
      socketToRoom.set(socket.id, normalizedId);
      socket.join(normalizedId);

      console.log(`[socket] ${username} (${socket.id}) joined room ${normalizedId}`);

      // Broadcast updated room state to all members, including the new joiner
      broadcastRoomUpdate(io, normalizedId);
    });

    // -----------------------------------------------------------------------
    // leave_room
    // Client sends: {} (no payload needed — we use the server-side
    //               socketToRoom lookup so the client can't spoof a roomId)
    // Server: removes the player, reassigns host to the next player if needed,
    //         and broadcasts the updated state to remaining members.
    //         Silently closes the room if it becomes empty.
    // -----------------------------------------------------------------------
    socket.on('leave_room', () => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;

      const result = removePlayerFromRoom(socket.id, roomId);
      if (!result) return;

      socket.leave(roomId);

      if (!result.deleted) {
        console.log(`[socket] ${socket.id} left room ${roomId}`);
        broadcastRoomUpdate(io, roomId);
      } else {
        console.log(`[socket] ${socket.id} left room ${roomId} — room closed (empty)`);
      }
    });

    // -----------------------------------------------------------------------
    // toggle_ready
    // Client sends: {} (no payload — server uses socketToRoom lookup)
    // Server: flips the calling player's `ready` boolean and broadcasts the
    //         updated player list to everyone in the room.
    //         Ignored if the socket isn't associated with any room.
    // -----------------------------------------------------------------------
    socket.on('toggle_ready', () => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room) return;

      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;

      player.ready = !player.ready;

      console.log(`[socket] ${socket.id} toggled ready → ${player.ready} in room ${roomId}`);
      broadcastRoomUpdate(io, roomId);
    });

    // -----------------------------------------------------------------------
    // start_race
    // Client sends: {} (only the host should call this)
    // Server: validates the caller is the host and all players are ready, then
    //         picks a random passage, sets room.status to 'racing', and
    //         broadcasts 'race_started' to the whole room with the passage and
    //         a startTime set 3 seconds in the future (countdown window).
    // -----------------------------------------------------------------------
    socket.on('start_race', () => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room) return;

      if (room.hostSocketId !== socket.id) {
        socket.emit('room_error', { message: 'Only the host can start the race.' });
        return;
      }
      if (room.status !== 'waiting') {
        socket.emit('room_error', { message: 'Race has already started.' });
        return;
      }
      if (!room.players.every((p) => p.ready)) {
        socket.emit('room_error', { message: 'All players must be ready before starting.' });
        return;
      }

      const passage = PASSAGES[Math.floor(Math.random() * PASSAGES.length)];
      room.passage = passage;
      room.status = 'racing';
      room.startTime = Date.now() + 3000; // 3-second countdown

      // Reset per-player race fields
      room.players.forEach((p) => {
        p.progress = 0;
        p.wpm = 0;
        p.finished = false;
        p.finalWpm = null;
        p.finalAccuracy = null;
        p.finishTime = null;
      });

      console.log(`[socket] host ${socket.id} started race in room ${roomId} — passage: "${passage.slice(0, 40)}…"`);

      io.to(roomId).emit('race_started', {
        roomId,
        passage,
        startTime: room.startTime,
      });
    });

    // -----------------------------------------------------------------------
    // progress_update
    // Client sends: { progress: number (0–100), wpm: number }
    // Server: updates this player's progress in the room state and broadcasts
    //         'progress_updated' with the full players progress list so every
    //         client can render progress bars in real time.
    // -----------------------------------------------------------------------
    socket.on('progress_update', ({ progress, wpm }) => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room || room.status !== 'racing') return;

      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player || player.finished) return;

      player.progress = Math.min(100, Math.max(0, progress));
      player.wpm = wpm;

      io.to(roomId).emit('progress_updated', {
        roomId,
        players: room.players.map((p) => ({
          socketId: p.socketId,
          username: p.username,
          progress: p.progress || 0,
          wpm: p.wpm || 0,
          finished: p.finished || false,
        })),
      });
    });

    // -----------------------------------------------------------------------
    // player_finished
    // Client sends: { wpm: number, accuracy: number }
    // Server: marks this player as finished, broadcasts 'player_finished' to
    //         the room with the player's stats and placement. If every player
    //         has finished, sets room.status to 'finished' and broadcasts
    //         'race_over' with the final sorted leaderboard.
    // -----------------------------------------------------------------------
    socket.on('player_finished', ({ wpm, accuracy }) => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room || room.status !== 'racing') return;

      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player || player.finished) return;

      player.finished = true;
      player.finalWpm = wpm;
      player.finalAccuracy = accuracy;
      player.finishTime = Date.now();
      player.progress = 100;

      const place = room.players.filter((p) => p.finished).length;

      console.log(`[socket] ${player.username} finished in place ${place} — ${wpm} WPM, ${accuracy}% acc`);

      io.to(roomId).emit('player_finished', {
        socketId: socket.id,
        username: player.username,
        wpm,
        accuracy,
        place,
      });

      // If everyone is done, end the race
      if (room.players.every((p) => p.finished)) {
        room.status = 'finished';

        const results = [...room.players]
          .sort((a, b) => a.finishTime - b.finishTime)
          .map((p, i) => ({
            socketId: p.socketId,
            username: p.username,
            finalWpm: p.finalWpm,
            finalAccuracy: p.finalAccuracy,
            place: i + 1,
          }));

        console.log(`[socket] race over in room ${roomId}`);
        io.to(roomId).emit('race_over', { roomId, results });
      }
    });

    // -----------------------------------------------------------------------
    // disconnect
    // Triggered automatically by Socket.io when a client drops (tab close,
    // network loss, etc.). Performs the same cleanup as leave_room using the
    // socketToRoom reverse-lookup map, since the disconnect event carries no
    // room context of its own.
    // -----------------------------------------------------------------------
    socket.on('disconnect', (reason) => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;

      console.log(`[socket] ${socket.id} disconnected (${reason}), cleaning up room ${roomId}`);

      const result = removePlayerFromRoom(socket.id, roomId);
      if (!result) return;

      if (!result.deleted) {
        broadcastRoomUpdate(io, roomId);
      } else {
        console.log(`[socket] room ${roomId} closed (no players remaining)`);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  setupSocket,
  generateRoomCode,
  rooms,
  socketToRoom,
};
