const rooms = new Map();
const socketToRoom = new Map();

function generateRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function getRoomSnapshot(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return null;

  return {
    roomCode,
    room: {
      ...room,
      players: room.players.map((player) => ({ ...player })),
    },
  };
}

function removePlayerFromRoom(socketId, roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return null;

  room.players = room.players.filter((player) => player.socketId !== socketId);

  if (room.players.length === 0) {
    rooms.delete(roomCode);
    socketToRoom.delete(socketId);
    return { deleted: true, roomCode };
  }

  if (room.hostSocketId === socketId) {
    room.hostSocketId = room.players[0].socketId;
    room.players[0].isHost = true;
  }

  socketToRoom.delete(socketId);
  return { deleted: false, roomCode };
}

function broadcastRoomUpdate(io, roomCode) {
  const snapshot = getRoomSnapshot(roomCode);
  if (!snapshot) return;
  io.to(roomCode).emit('room_updated', snapshot);
}

function setupSocket(io) {
  io.on('connection', (socket) => {
    socket.on('create_room', ({ username }) => {
      let roomCode = generateRoomCode();
      while (rooms.has(roomCode)) {
        roomCode = generateRoomCode();
      }

      const room = {
        roomCode,
        hostSocketId: socket.id,
        status: 'waiting',
        players: [
          {
            socketId: socket.id,
            username,
            isHost: true,
            ready: false,
          },
        ],
      };

      rooms.set(roomCode, room);
      socketToRoom.set(socket.id, roomCode);
      socket.join(roomCode);
      socket.emit('room_created', getRoomSnapshot(roomCode));
    });

    socket.on('join_room', ({ roomCode, username }) => {
      const normalizedCode = roomCode ? roomCode.trim().toUpperCase() : null;
      const room = rooms.get(normalizedCode);

      if (!room) {
        socket.emit('room_error', { message: 'Room not found.' });
        return;
      }

      if (room.status !== 'waiting') {
        socket.emit('room_error', { message: 'Room is already in progress.' });
        return;
      }

      if (room.players.length >= 6) {
        socket.emit('room_error', { message: 'Room is full.' });
        return;
      }

      const player = {
        socketId: socket.id,
        username,
        isHost: false,
        ready: false,
      };

      room.players.push(player);
      socketToRoom.set(socket.id, normalizedCode);
      socket.join(normalizedCode);
      broadcastRoomUpdate(io, normalizedCode);
    });

    socket.on('leave_room', () => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;

      const result = removePlayerFromRoom(socket.id, roomCode);
      if (!result) return;

      if (!result.deleted) {
        broadcastRoomUpdate(io, roomCode);
      }
    });

    socket.on('toggle_ready', () => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;

      const room = rooms.get(roomCode);
      if (!room) return;

      const player = room.players.find((entry) => entry.socketId === socket.id);
      if (!player) return;

      player.ready = !player.ready;
      broadcastRoomUpdate(io, roomCode);
    });

    socket.on('disconnect', () => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;

      const result = removePlayerFromRoom(socket.id, roomCode);
      if (!result) return;

      if (!result.deleted) {
        broadcastRoomUpdate(io, roomCode);
      }
    });
  });
}

module.exports = {
  setupSocket,
  generateRoomCode,
  rooms,
  socketToRoom,
};
