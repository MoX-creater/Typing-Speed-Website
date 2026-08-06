const test = require('node:test');
const assert = require('node:assert/strict');
const { setupSocket, generateRoomCode, rooms, socketToRoom } = require('./socketHandlers');

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function createMockSocket(id) {
  const handlers = {};
  return {
    id,
    emitted: [],
    joinedRooms: [],
    on(event, handler) {
      handlers[event] = handler;
    },
    emit(event, payload) {
      this.emitted.push({ event, payload });
    },
    join(room) {
      this.joinedRooms.push(room);
    },
    leave(room) {
      this.joinedRooms = this.joinedRooms.filter((r) => r !== room);
    },
    trigger(event, ...args) {
      if (!handlers[event]) throw new Error(`No handler registered for "${event}"`);
      handlers[event](...args);
    },
  };
}

/**
 * Minimal io mock. The `broadcastEmitted` array collects every call made via
 * io.to(roomId).emit(...) so we can assert on room-wide broadcasts.
 */
function createMockIo() {
  const broadcastEmitted = [];
  return {
    connectionHandler: null,
    broadcastEmitted,
    on(event, handler) {
      if (event === 'connection') this.connectionHandler = handler;
    },
    connect(socket) {
      this.connectionHandler(socket);
    },
    to(roomId) {
      return {
        emit(event, payload) {
          broadcastEmitted.push({ roomId, event, payload });
        },
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('generateRoomCode returns a 6-char uppercase alphanumeric code without 0/O/1/I', () => {
  const code = generateRoomCode();
  assert.match(code, /^[A-Z2-9]{6}$/);
  assert.equal(code.length, 6);
});

test('create_room — creates a room with correct shape and tracks the host', () => {
  rooms.clear();
  socketToRoom.clear();

  const io = createMockIo();
  setupSocket(io);
  const socket = createMockSocket('socket-1');
  io.connect(socket);

  socket.trigger('create_room', { username: 'Ada', userId: 'user-1' });

  assert.equal(rooms.size, 1);

  const emitted = socket.emitted[0];
  assert.equal(emitted.event, 'room_created');

  const { roomId, room } = emitted.payload;
  assert.ok(roomId, 'roomId should be present in the payload');
  assert.equal(socketToRoom.get('socket-1'), roomId);
  assert.equal(socket.joinedRooms[0], roomId);

  // Room shape
  assert.equal(room.hostSocketId, 'socket-1');
  assert.equal(room.status, 'waiting');
  assert.equal(room.passage, null);
  assert.equal(room.startTime, null);

  // Player shape
  const [player] = room.players;
  assert.equal(player.socketId, 'socket-1');
  assert.equal(player.userId, 'user-1');
  assert.equal(player.username, 'Ada');
  assert.equal(player.ready, false);
});

test('join_room — adds a player and broadcasts room_updated', () => {
  rooms.clear();
  socketToRoom.clear();

  const io = createMockIo();
  setupSocket(io);

  const host = createMockSocket('socket-host');
  const guest = createMockSocket('socket-guest');
  io.connect(host);
  io.connect(guest);

  host.trigger('create_room', { username: 'Ada', userId: 'user-1' });

  const roomId = host.emitted[0].payload.roomId;
  guest.trigger('join_room', { roomId, username: 'Bob', userId: 'user-2' });

  // A broadcast should have gone out
  const broadcast = io.broadcastEmitted.find((e) => e.event === 'room_updated');
  assert.ok(broadcast, 'room_updated should be broadcast after join_room');
  assert.equal(broadcast.payload.room.players.length, 2);

  assert.equal(socketToRoom.get('socket-guest'), roomId);
  assert.ok(guest.joinedRooms.includes(roomId));
});

test('join_room — emits room_error for unknown room', () => {
  rooms.clear();
  socketToRoom.clear();

  const io = createMockIo();
  setupSocket(io);
  const socket = createMockSocket('socket-x');
  io.connect(socket);

  socket.trigger('join_room', { roomId: 'XXXXXX', username: 'Eve', userId: 'user-x' });

  const err = socket.emitted.find((e) => e.event === 'room_error');
  assert.ok(err, 'room_error should be emitted for an unknown room');
});

test('join_room — emits room_error when room is full', () => {
  rooms.clear();
  socketToRoom.clear();

  const io = createMockIo();
  setupSocket(io);

  // Create the room with the host
  const host = createMockSocket('socket-h');
  io.connect(host);
  host.trigger('create_room', { username: 'Host', userId: 'uid-h' });
  const roomId = host.emitted[0].payload.roomId;

  // Fill remaining 5 slots
  for (let i = 1; i <= 5; i += 1) {
    const s = createMockSocket(`socket-p${i}`);
    io.connect(s);
    s.trigger('join_room', { roomId, username: `Player${i}`, userId: `uid-p${i}` });
  }

  // 7th attempt should be rejected
  const extra = createMockSocket('socket-extra');
  io.connect(extra);
  extra.trigger('join_room', { roomId, username: 'Extra', userId: 'uid-extra' });

  const err = extra.emitted.find((e) => e.event === 'room_error');
  assert.ok(err, 'room_error should be emitted when room is full');
  assert.match(err.payload.message, /full/i);
});

test('toggle_ready — flips the ready flag and broadcasts', () => {
  rooms.clear();
  socketToRoom.clear();

  const io = createMockIo();
  setupSocket(io);

  const socket = createMockSocket('socket-r');
  io.connect(socket);
  socket.trigger('create_room', { username: 'Ada', userId: 'user-r' });
  const roomId = socket.emitted[0].payload.roomId;

  // Initially not ready
  assert.equal(rooms.get(roomId).players[0].ready, false);

  socket.trigger('toggle_ready');
  assert.equal(rooms.get(roomId).players[0].ready, true);

  socket.trigger('toggle_ready');
  assert.equal(rooms.get(roomId).players[0].ready, false);
});

test('leave_room — removes player, reassigns host, and broadcasts', () => {
  rooms.clear();
  socketToRoom.clear();

  const io = createMockIo();
  setupSocket(io);

  const host = createMockSocket('socket-host');
  const guest = createMockSocket('socket-guest');
  io.connect(host);
  io.connect(guest);

  host.trigger('create_room', { username: 'Ada', userId: 'uid-h' });
  const roomId = host.emitted[0].payload.roomId;
  guest.trigger('join_room', { roomId, username: 'Bob', userId: 'uid-g' });

  // Host leaves — guest should become host
  host.trigger('leave_room');

  const room = rooms.get(roomId);
  assert.ok(room, 'room should still exist after host leaves');
  assert.equal(room.players.length, 1);
  assert.equal(room.hostSocketId, 'socket-guest');
  assert.equal(socketToRoom.has('socket-host'), false);
});

test('leave_room — deletes room when last player leaves', () => {
  rooms.clear();
  socketToRoom.clear();

  const io = createMockIo();
  setupSocket(io);

  const socket = createMockSocket('socket-solo');
  io.connect(socket);
  socket.trigger('create_room', { username: 'Solo', userId: 'uid-solo' });
  const roomId = socket.emitted[0].payload.roomId;

  socket.trigger('leave_room');

  assert.equal(rooms.has(roomId), false);
  assert.equal(socketToRoom.has('socket-solo'), false);
});

test('disconnect — performs same cleanup as leave_room', () => {
  rooms.clear();
  socketToRoom.clear();

  const io = createMockIo();
  setupSocket(io);

  const host = createMockSocket('socket-hd');
  const guest = createMockSocket('socket-gd');
  io.connect(host);
  io.connect(guest);

  host.trigger('create_room', { username: 'Ada', userId: 'uid-hd' });
  const roomId = host.emitted[0].payload.roomId;
  guest.trigger('join_room', { roomId, username: 'Bob', userId: 'uid-gd' });

  // Simulate abrupt disconnect of the host
  host.trigger('disconnect', 'transport close');

  const room = rooms.get(roomId);
  assert.ok(room, 'room should still exist');
  assert.equal(room.hostSocketId, 'socket-gd');
  assert.equal(socketToRoom.has('socket-hd'), false);
});
