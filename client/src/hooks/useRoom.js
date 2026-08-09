import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

/**
 * useRoom — manages a single Socket.io connection for multiplayer rooms.
 *
 * Connects to the server on mount and disconnects on unmount.
 * Exposes the current room state, race state, and action callbacks for the UI.
 *
 * @param {{ uid?: string, _id?: string, id?: string, displayName?: string, username?: string, email?: string } | null} user
 */
export function useRoom(user) {
  const socketRef = useRef(null);

  // ── Connection ────────────────────────────────────────────────────────────
  const [connected, setConnected] = useState(false);
  const [socketId, setSocketId] = useState(null);

  // ── Room (Phase 1) ────────────────────────────────────────────────────────
  const [roomId, setRoomId] = useState(null);
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);

  // ── Race (Phase 2) ────────────────────────────────────────────────────────
  /** The passage text the server picked for this race */
  const [racePassage, setRacePassage] = useState(null);
  /**
   * Countdown seconds remaining (3 → 2 → 1 → 0 = GO).
   * null means not in countdown / race phase at all.
   */
  const [countdown, setCountdown] = useState(null);
  /**
   * Live progress of all players:
   * Array<{ socketId, username, progress (0-100), wpm, finished }>
   */
  const [playerProgress, setPlayerProgress] = useState([]);
  /**
   * Final leaderboard after the race ends (race_over event).
   * Array<{ place, socketId, username, finalWpm, finalAccuracy }>
   */
  const [raceResults, setRaceResults] = useState(null);
  const raceResultSavedRef = useRef(false);
  const userRef = useRef(user);

  const countdownRef = useRef(null);

  // ── Socket setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const socket = io(SERVER_URL, { autoConnect: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setSocketId(socket.id);
    });

    socket.on('disconnect', () => {
      setConnected(false);
      setSocketId(null);
    });

    // ── Phase 1 events ──

    socket.on('room_created', (snapshot) => {
      setRoomId(snapshot.roomId);
      setRoom(snapshot.room);
      setError(null);
    });

    socket.on('room_updated', (snapshot) => {
      setRoomId(snapshot.roomId);
      setRoom(snapshot.room);
      setError(null);
    });

    socket.on('room_error', ({ message }) => {
      setError(message);
    });

    // ── Phase 2 events ──

    /**
     * race_started — server picked a passage and set a startTime.
     * We start a 3-second visual countdown then allow typing when it hits 0.
     */
    socket.on('race_started', ({ passage, startTime }) => {
      setRacePassage(passage);
      setRaceResults(null);
      setPlayerProgress([]);
      raceResultSavedRef.current = false;

      const tick = () => {
        const msLeft = startTime - Date.now();
        if (msLeft <= 0) {
          setCountdown(0); // 0 = "GO" / typing unlocked
          clearInterval(countdownRef.current);
          return;
        }
        setCountdown(Math.ceil(msLeft / 1000));
      };

      tick();
      countdownRef.current = setInterval(tick, 200);
    });

    /**
     * progress_updated — any player moved; re-render the progress bars.
     */
    socket.on('progress_updated', ({ players }) => {
      setPlayerProgress(players);
    });

    /**
     * player_finished — one player crossed the line.
     * Mark them finished in the local progress list.
     */
    socket.on('player_finished', ({ socketId: finishedId, wpm }) => {
      setPlayerProgress((prev) =>
        prev.map((p) =>
          p.socketId === finishedId
            ? { ...p, progress: 100, finished: true, wpm }
            : p,
        ),
      );
    });

    /**
     * race_over — all players finished; server sends the sorted leaderboard.
     */
    socket.on('race_over', ({ roomId: endedRoomId, results }) => {
      setRaceResults(results);
      clearInterval(countdownRef.current);

      if (raceResultSavedRef.current) return;
      if (!Array.isArray(results)) return;

      const currentUser = userRef.current;
      if (!currentUser) return;

      const currentUserId = currentUser?.uid || currentUser?._id || currentUser?.id;
      if (!currentUserId) return;

      const finalResult = results.find((r) => r.socketId === socketRef.current?.id);
      if (!finalResult) return;

      raceResultSavedRef.current = true;
      addDoc(collection(db, 'sessions'), {
        userId: currentUserId,
        username: currentUser?.displayName || currentUser?.username || currentUser?.email || 'Anonymous',
        mode: 'multiplayer',
        roomId: endedRoomId,
        rank: finalResult.place,
        wpm: Number(finalResult.finalWpm),
        accuracy: Number(finalResult.finalAccuracy),
        duration: null,
        createdAt: serverTimestamp(),
      }).catch(console.error);
    });

    return () => {
      clearInterval(countdownRef.current);
      socket.disconnect();
    };
  }, [user]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const getUserId = () => user?.uid || user?._id || user?.id || null;
  const getUsername = () =>
    user?.displayName || user?.username || user?.email || 'Anonymous';

  // ── Phase 1 actions ───────────────────────────────────────────────────────

  const createRoom = useCallback(() => {
    if (!user) return;
    setError(null);
    socketRef.current?.emit('create_room', {
      userId: getUserId(),
      username: getUsername(),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const joinRoom = useCallback((code) => {
    if (!user || !code) return;
    setError(null);
    socketRef.current?.emit('join_room', {
      roomId: code.trim().toUpperCase(),
      userId: getUserId(),
      username: getUsername(),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('leave_room');
    clearInterval(countdownRef.current);
    setRoomId(null);
    setRoom(null);
    setRacePassage(null);
    setCountdown(null);
    setPlayerProgress([]);
    setRaceResults(null);
    setError(null);
  }, []);

  const toggleReady = useCallback(() => {
    socketRef.current?.emit('toggle_ready');
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // ── Phase 2 actions ───────────────────────────────────────────────────────

  /** Host calls this to begin the race. Server picks the passage and startTime. */
  const startRace = useCallback(() => {
    socketRef.current?.emit('start_race');
  }, []);

  /**
   * Typing component calls this periodically as the player progresses.
   * @param {number} progress - 0–100 percentage of passage completed
   * @param {number} wpm      - current live WPM
   */
  const sendProgress = useCallback((progress, wpm) => {
    socketRef.current?.emit('progress_update', { progress, wpm });
  }, []);

  /**
   * Typing component calls this when the player types the last character.
   * @param {number} wpm      - final WPM
   * @param {number} accuracy - final accuracy 0–100
   */
  const finishRace = useCallback((wpm, accuracy) => {
    socketRef.current?.emit('player_finished', { wpm, accuracy });
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────

  const isHost = !!room && room.hostSocketId === socketRef.current?.id;
  /** True once the countdown hits 0 and the race is actively in progress */
  const raceActive = countdown === 0 && !!racePassage && !raceResults;

  return {
    // connection
    connected,
    socketId,
    // room
    roomId,
    room,
    error,
    isHost,
    // race
    racePassage,
    countdown,
    playerProgress,
    raceResults,
    raceActive,
    // phase 1 actions
    createRoom,
    joinRoom,
    leaveRoom,
    toggleReady,
    clearError,
    // phase 2 actions
    startRace,
    sendProgress,
    finishRace,
  };
}
