const test = require('node:test');
const assert = require('node:assert/strict');
const { setupSocket, generateRoomCode, rooms, socketToRoom } = require('./socketHandlers');

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
      this.joinedRooms = this.joinedRooms.filter((value) => value !== room);
    },
    trigger(event, ...args) {
      handlers[event](...args);
    }
  };
}

function createMockIo() {
  return {
    connectionHandler: null,
    on(event, handler) {
      if (event === 'connection') {
        this.connectionHandler = handler;
      }
    },
    connect(socket) {
      this.connectionHandler(socket);
    }
  };
}

test('generateRoomCode returns an uppercase alphanumeric code', () => {
  const code = generateRoomCode();
  assert.match(code, /^[A-Z2-9]{6}$/);
  assert.equal(code.length, 6);
});

test('create_room creates a room and tracks the host', () => {
  rooms.clear();
  socketToRoom.clear();

  const io = createMockIo();
  setupSocket(io);
  const socket = createMockSocket('socket-1');

  io.connect(socket);
  socket.trigger('create_room', { username: 'Ada' });

  assert.equal(rooms.size, 1);
  const roomCode = socket.emitted[0].payload.roomCode;
  assert.equal(socketToRoom.get('socket-1'), roomCode);
  assert.equal(socket.joinedRooms[0], roomCode);
  assert.equal(socket.emitted[0].event, 'room_created');
  assert.equal(socket.emitted[0].payload.room.players[0].username, 'Ada');
});
