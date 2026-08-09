# Multiplayer Feature — Client Integration Walkthrough

This covers **Phase 1 only**: creating/joining rooms and seeing who is in the lobby.
Race logic (countdown, live progress) is Phase 2.

---

## How it works end-to-end

```
Browser A                     Server (port 5000)                   Browser B
─────────                     ──────────────────                   ─────────
socket.emit('create_room')  → creates room, stores in Map
                            ← socket.emit('room_created', snapshot)
                                                               socket.emit('join_room')
                            ← io.to(roomId).emit('room_updated', snapshot)  → both browsers get updated player list
socket.emit('toggle_ready') →
                            ← io.to(roomId).emit('room_updated', snapshot)  → all players see Ada is ready
```

The server **never pushes anything unprompted** in Phase 1.
Every update is triggered by a client event. The shape that arrives on `room_updated` and `room_created` is always:

```js
{
  roomId: "A3KX7M",           // 6-char code to share with friends
  room: {
    roomId: "A3KX7M",
    hostSocketId: "abc123",
    status: "waiting",        // 'waiting' | 'racing' | 'finished'
    passage: null,            // null until Phase 2
    startTime: null,          // null until Phase 2
    players: [
      { socketId: "abc123", userId: "user-1", username: "Ada", ready: false },
      { socketId: "def456", userId: "user-2", username: "Bob", ready: false },
    ]
  }
}
```

---

## Step 1 — Install `socket.io-client` in the React app

```bash
cd client
npm install socket.io-client
```

---

## Step 2 — Create a `useRoom` hook

Create **`client/src/hooks/useRoom.js`**:

```js
import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

/**
 * useRoom — manages a single Socket.io connection for multiplayer rooms.
 *
 * @param {{ userId: string, username: string } | null} user  - from App.jsx state
 */
export function useRoom(user) {
  const socketRef = useRef(null);
  const [roomId, setRoomId] = useState(null);
  const [room, setRoom] = useState(null);       // full room object
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);

  // Connect once on mount, disconnect on unmount
  useEffect(() => {
    const socket = io(SERVER_URL, { autoConnect: true });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    // Server → client: you just created a room
    socket.on('room_created', (snapshot) => {
      setRoomId(snapshot.roomId);
      setRoom(snapshot.room);
      setError(null);
    });

    // Server → client: someone joined/left/toggled ready — full room state
    socket.on('room_updated', (snapshot) => {
      setRoomId(snapshot.roomId);
      setRoom(snapshot.room);
      setError(null);
    });

    // Server → client: something went wrong (room full, not found, etc.)
    socket.on('room_error', ({ message }) => {
      setError(message);
    });

    return () => socket.disconnect();
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────

  const createRoom = useCallback(() => {
    if (!user) return;
    setError(null);
    socketRef.current?.emit('create_room', {
      userId: user.uid || user._id || user.id,
      username: user.displayName || user.username || user.email,
    });
  }, [user]);

  const joinRoom = useCallback((code) => {
    if (!user) return;
    setError(null);
    socketRef.current?.emit('join_room', {
      roomId: code.trim().toUpperCase(),
      userId: user.uid || user._id || user.id,
      username: user.displayName || user.username || user.email,
    });
  }, [user]);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('leave_room');
    setRoomId(null);
    setRoom(null);
  }, []);

  const toggleReady = useCallback(() => {
    socketRef.current?.emit('toggle_ready');
  }, []);

  const isHost = room?.hostSocketId === socketRef.current?.id;

  return {
    connected,
    roomId,
    room,
    error,
    isHost,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleReady,
  };
}
```

---

## Step 3 — Create a `MultiplayerLobby` component

Create **`client/src/components/MultiplayerLobby.jsx`**:

```jsx
import { useState } from 'react';
import { useRoom } from '../hooks/useRoom';

export default function MultiplayerLobby({ user }) {
  const {
    connected, roomId, room, error,
    isHost, createRoom, joinRoom, leaveRoom, toggleReady,
  } = useRoom(user);

  const [joinCode, setJoinCode] = useState('');

  // ── Not connected yet ──────────────────────────────────────────────────────
  if (!connected) {
    return <div className="page"><p>Connecting to server…</p></div>;
  }

  // ── Inside a room ──────────────────────────────────────────────────────────
  if (room) {
    const mySocketId = /* you can expose socket.id from the hook if needed */ null;
    const allReady = room.players.length > 1 && room.players.every(p => p.ready);

    return (
      <div className="page multiplayer-page">
        <h1>Room <code>{roomId}</code></h1>
        <p className="room-hint">Share this code with your friends!</p>

        {error && <div className="error-banner">{error}</div>}

        <ul className="player-list">
          {room.players.map(p => (
            <li key={p.socketId} className={`player-item ${p.ready ? 'ready' : ''}`}>
              <span className="player-name">{p.username}</span>
              {room.hostSocketId === p.socketId && <span className="badge host">HOST</span>}
              <span className={`badge ${p.ready ? 'ready' : 'waiting'}`}>
                {p.ready ? 'READY' : 'WAITING'}
              </span>
            </li>
          ))}
        </ul>

        <div className="lobby-actions">
          <button onClick={toggleReady} className="btn btn-primary">
            Toggle Ready
          </button>
          {isHost && allReady && (
            <button className="btn btn-accent" disabled>
              {/* Start Race — Phase 2 */}
              Start Race ▶
            </button>
          )}
          <button onClick={leaveRoom} className="btn btn-ghost">
            Leave Room
          </button>
        </div>
      </div>
    );
  }

  // ── No room yet ────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="page">
        <p>You must be logged in to use multiplayer.</p>
      </div>
    );
  }

  return (
    <div className="page multiplayer-page">
      <h1>Multiplayer</h1>

      {error && <div className="error-banner">{error}</div>}

      <div className="lobby-entry">
        <button onClick={createRoom} className="btn btn-primary">
          Create Room
        </button>

        <div className="divider">or</div>

        <div className="join-form">
          <input
            type="text"
            placeholder="Enter room code"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="room-input"
          />
          <button
            onClick={() => joinRoom(joinCode)}
            disabled={joinCode.length < 6}
            className="btn btn-secondary"
          >
            Join Room
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Step 4 — Add the route in `App.jsx`

```diff
// App.jsx

+ import MultiplayerLobby from "./components/MultiplayerLobby";

  <Routes>
    <Route path="/"             element={<TypingTest user={user} />} />
    <Route path="/results"      element={<Results user={user} />} />
    <Route path="/leaderboard"  element={<Leaderboard />} />
+   <Route path="/multiplayer"  element={<MultiplayerLobby user={user} />} />
    <Route path="/login"        element={<Login onLogin={handleLogin} />} />
    <Route path="/register"     element={<Register onLogin={handleLogin} />} />
    <Route path="/profile"      element={<Profile user={user} />} />
    <Route path="/profile/:userId" element={<Profile user={user} />} />
  </Routes>
```

Add a link in **`Navbar.jsx`** wherever the other nav links live:

```jsx
<Link to="/multiplayer">Multiplayer</Link>
```

---

## Step 5 — Add the environment variable (optional)

If your server runs somewhere other than `localhost:5000`, add to **`client/.env`**:

```
VITE_SERVER_URL=http://localhost:5000
```

Vite exposes only variables prefixed with `VITE_` to the browser.

---

## Event reference (what the server accepts / emits)

| Direction | Event | Payload you send | What happens |
|---|---|---|---|
| Client → Server | `create_room` | `{ userId, username }` | Creates room, emits `room_created` back to you |
| Client → Server | `join_room` | `{ roomId, userId, username }` | Adds you, broadcasts `room_updated` to all |
| Client → Server | `leave_room` | *(none)* | Removes you, broadcasts `room_updated` to rest |
| Client → Server | `toggle_ready` | *(none)* | Flips your ready flag, broadcasts `room_updated` |
| Server → Client | `room_created` | `{ roomId, room }` | Only to the creator |
| Server → Client | `room_updated` | `{ roomId, room }` | To **everyone** in the room |
| Server → Client | `room_error` | `{ message }` | Only to the socket that caused the error |

---

## What you get for free from the server

| Behaviour | How |
|---|---|
| Host reassignment | If the host disconnects, next player in `players[]` becomes host automatically |
| Room cleanup | Room is deleted from memory when the last player leaves |
| Full/racing guard | `room_error` sent if you try to join a full (6-player) or already-started room |
| Disconnect cleanup | Works even on tab close — `socketToRoom` reverse-map ensures the player is removed |
| Code normalisation | Room codes are case-insensitive — `a3kx7m` works the same as `A3KX7M` |

---

## What's NOT done yet (Phase 2)

- Starting the race (server sets `status: 'racing'`, picks a passage, broadcasts it)
- Countdown before start
- Live progress (each player emits their WPM/position as they type)
- Finish detection and final leaderboard
