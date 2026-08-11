import { useState, useEffect } from 'react';
import { useRoom } from '../hooks/useRoom';
import MultiplayerRace from './MultiplayerRace';
import { generateRaceSummary } from '../api';
import { getAuthToken } from '../../lib/authToken';

/* ── small sub-components ─────────────────────────────────────────────────── */

function ConnDot({ connected }) {
  return (
    <span
      className={`mp-conn-dot ${connected ? 'mp-conn-dot--on' : 'mp-conn-dot--off'}`}
      title={connected ? 'Connected' : 'Connecting…'}
    />
  );
}

function PlayerRow({ player, isHost, isMe }) {
  return (
    <li className={`mp-player-row ${player.ready ? 'mp-player-row--ready' : ''}`}>
      <span className="mp-player-avatar">
        {player.username.slice(0, 2).toUpperCase()}
      </span>
      <span className="mp-player-name">
        {player.username}
        {isMe && <span className="mp-badge mp-badge--you">YOU</span>}
      </span>
      <div className="mp-player-tags">
        {isHost && <span className="mp-badge mp-badge--host">HOST</span>}
        <span className={`mp-badge ${player.ready ? 'mp-badge--ready' : 'mp-badge--waiting'}`}>
          {player.ready ? '✓ READY' : 'WAITING'}
        </span>
      </div>
    </li>
  );
}

/* ── Countdown overlay ────────────────────────────────────────────────────── */
function CountdownOverlay({ countdown }) {
  const label = countdown === 0 ? 'GO!' : countdown;
  return (
    <div className="mp-countdown-overlay">
      <div className={`mp-countdown-number ${countdown === 0 ? 'mp-countdown-go' : ''}`}>
        {label}
      </div>
    </div>
  );
}

/* ── Race results ─────────────────────────────────────────────────────────── */
function formatPlace(place) {
  if (place === 1) return "1st";
  if (place === 2) return "2nd";
  if (place === 3) return "3rd";
  return `#${place}`;
}

function RaceResults({ results, socketId, racePerformance, onPlayAgain }) {
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(!!racePerformance);
  const [summaryError, setSummaryError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchSummary() {
      if (!racePerformance) {
        setSummaryError("Performance data unavailable for this race.");
        setSummaryLoading(false);
        return;
      }

      const token = await getAuthToken();
      if (!token) {
        setSummaryError("Sign in again to see your AI race summary.");
        setSummaryLoading(false);
        return;
      }

      const myResult = results.find((r) => r.socketId === socketId);

      try {
        const { data } = await generateRaceSummary({
          ...racePerformance,
          placement: myResult?.place,
          playerCount: results.length,
        });
        if (!cancelled) {
          setSummary(data.summary);
          setSummaryError("");
        }
      } catch (err) {
        if (!cancelled) {
          setSummaryError(err.response?.data?.error || "Could not load race summary.");
        }
      } finally {
        if (!cancelled) {
          setSummaryLoading(false);
        }
      }
    }

    fetchSummary();
    return () => {
      cancelled = true;
    };
  }, [results, socketId, racePerformance]);

  return (
    <div className="mp-card mp-results-card">
      <h2 className="mp-results-title">Race Over</h2>

      <div className="mp-results-body">
        <div className="mp-race-summary">
          <span className="mp-race-summary-label">Performance summary</span>
          {summaryLoading && <p className="mp-race-summary-text muted">Generating your race summary…</p>}
          {!summaryLoading && summary && (
            <p className="mp-race-summary-text">{summary}</p>
          )}
          {!summaryLoading && !summary && summaryError && (
            <p className="mp-race-summary-text muted">{summaryError}</p>
          )}
        </div>

        <ol className="mp-results-list">
          {results.map((r) => (
            <li
              key={r.socketId}
              className={`mp-result-row ${r.socketId === socketId ? 'mp-result-row--me' : ''}`}
            >
              <span className="mp-result-place">{formatPlace(r.place)}</span>
              <span className="mp-result-name">{r.username}</span>
              <span className="mp-result-wpm">{r.finalWpm} WPM</span>
              <span className="mp-result-acc">{r.finalAccuracy}%</span>
            </li>
          ))}
        </ol>
      </div>

      <button className="btn btn-primary mp-again-btn" onClick={onPlayAgain}>
        Back to lobby
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════════════════════════════════ */

export default function MultiplayerLobby({ user }) {
  const {
    connected, socketId,
    roomId, room, error, isHost,
    racePassage, countdown, playerProgress, raceResults, myRacePerformance, raceActive,
    createRoom, joinRoom, leaveRoom, toggleReady, clearError,
    startRace, sendProgress, finishRace,
  } = useRoom(user);

  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied]     = useState(false);

  /* ── helpers ── */

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    joinRoom(joinCode);
  };

  const myPlayer = room?.players.find((p) => p.socketId === socketId);
  const amReady  = myPlayer?.ready ?? false;
  const allReady = room?.players.length > 1 && room?.players.every((p) => p.ready);

  /* ── connecting ─────────────────────────────────────────────────────────── */

  if (!connected) {
    return (
      <div className="page mp-page">
        <div className="mp-connecting">
          <div className="mp-spinner" />
          <p>Connecting to server…</p>
        </div>
      </div>
    );
  }

  /* ── not logged in ──────────────────────────────────────────────────────── */

  if (!user) {
    return (
      <div className="page mp-page">
        <div className="mp-card mp-auth-prompt">
          <div className="mp-auth-icon">🔒</div>
          <h2>Sign in to play</h2>
          <p>You need to be logged in to create or join a multiplayer race.</p>
          <a href="/login" className="btn btn-primary">Sign In</a>
        </div>
      </div>
    );
  }

  /* ── race results ───────────────────────────────────────────────────────── */

  if (raceResults) {
    return (
      <div className="page mp-page">
        <RaceResults
          results={raceResults}
          socketId={socketId}
          racePerformance={myRacePerformance}
          onPlayAgain={leaveRoom}
        />
      </div>
    );
  }

  /* ── countdown + live race ──────────────────────────────────────────────── */

  if (racePassage !== null) {
    return (
      <div className="page mp-page">
        {countdown !== null && countdown > 0 && (
          <CountdownOverlay countdown={countdown} />
        )}
        <div className="mp-room-header">
          <ConnDot connected={connected} />
          <h1 className="mp-room-title">Race</h1>
          <span className="mp-code-chip">{roomId}</span>
        </div>

        {error && (
          <div className="mp-error-banner" role="alert">
            {error}
            <button className="mp-error-close" onClick={clearError}>✕</button>
          </div>
        )}

        <MultiplayerRace
          passage={racePassage}
          socketId={socketId}
          playerProgress={playerProgress}
          sendProgress={sendProgress}
          finishRace={finishRace}
        />
      </div>
    );
  }

  /* ── inside a room (lobby) ──────────────────────────────────────────────── */

  if (room) {
    return (
      <div className="page mp-page">
        <div className="mp-room-header">
          <ConnDot connected={connected} />
          <h1 className="mp-room-title">Race Lobby</h1>
        </div>

        {/* Room code banner */}
        <div className="mp-code-banner">
          <span className="mp-code-label">ROOM CODE</span>
          <span className="mp-code-value">{roomId}</span>
          <button
            className={`btn btn-ghost mp-copy-btn ${copied ? 'mp-copy-btn--copied' : ''}`}
            onClick={handleCopy}
            title="Copy room code"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>

        {error && (
          <div className="mp-error-banner" role="alert">
            {error}
            <button className="mp-error-close" onClick={clearError}>✕</button>
          </div>
        )}

        {/* Player list */}
        <div className="mp-card mp-players-card">
          <div className="mp-card-header">
            <span>Players</span>
            <span className="mp-player-count">{room.players.length} / 6</span>
          </div>
          <ul className="mp-player-list">
            {room.players.map((p) => (
              <PlayerRow
                key={p.socketId}
                player={p}
                isHost={p.socketId === room.hostSocketId}
                isMe={p.socketId === socketId}
              />
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="mp-lobby-actions">
          <button
            className={`btn ${amReady ? 'btn-secondary' : 'btn-primary'} mp-ready-btn`}
            onClick={toggleReady}
          >
            {amReady ? 'Cancel Ready' : 'Ready Up ✓'}
          </button>

          {isHost && (
            <button
              className="btn btn-primary mp-start-btn"
              disabled={!allReady}
              onClick={startRace}
              title={
                allReady
                  ? 'Start the race!'
                  : 'Waiting for all players to be ready'
              }
            >
              {allReady
                ? 'Start Race ▶'
                : `Waiting (${room.players.filter((p) => p.ready).length}/${room.players.length} ready)`}
            </button>
          )}

          <button className="btn btn-ghost" onClick={leaveRoom}>
            ← Leave Room
          </button>
        </div>

        <p className="mp-hint">
          {isHost
            ? 'Share the room code with friends, then start when everyone is ready.'
            : 'Waiting for the host to start the race…'}
        </p>
      </div>
    );
  }

  /* ── no room yet (entry) ────────────────────────────────────────────────── */

  return (
    <div className="page mp-page">
      <div className="mp-entry-header">
        <ConnDot connected={connected} />
        <h1 className="mp-entry-title">Multiplayer</h1>
        <p className="mp-entry-sub">Race against friends in real time</p>
      </div>

      {error && (
        <div className="mp-error-banner" role="alert">
          {error}
          <button className="mp-error-close" onClick={clearError}>✕</button>
        </div>
      )}

      <div className="mp-entry-grid">
        {/* Create card */}
        <div className="mp-card mp-create-card">
          <div className="mp-card-icon">🏁</div>
          <h2>Create Room</h2>
          <p>Start a new race and invite up to 5 friends with a 6-character code.</p>
          <button className="btn btn-primary mp-action-btn" onClick={createRoom}>
            Create Room
          </button>
        </div>

        <div className="mp-divider">
          <span>or</span>
        </div>

        {/* Join card */}
        <div className="mp-card mp-join-card">
          <div className="mp-card-icon">🔗</div>
          <h2>Join Room</h2>
          <p>Enter the 6-character code your friend shared with you.</p>
          <form onSubmit={handleJoinSubmit} className="mp-join-form">
            <input
              id="mp-join-input"
              type="text"
              className="input-field mp-code-input"
              placeholder="e.g. A3KX7M"
              value={joinCode}
              onChange={(e) => {
                clearError();
                setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
              }}
              maxLength={6}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="submit"
              className="btn btn-secondary mp-action-btn"
              disabled={joinCode.length < 6}
            >
              Join Room
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
