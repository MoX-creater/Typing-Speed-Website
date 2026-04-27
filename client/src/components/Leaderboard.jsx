import { useState, useEffect } from "react";
import { getLeaderboard } from "../api";

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard()
      .then(({ data }) => setLeaders(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <div className="container leaderboard-page">
        <h1>Leaderboard</h1>
        <p className="subtitle">Top typists ranked by best WPM</p>

        {loading ? (
          <p style={{ color: "var(--text-secondary)", textAlign: "center", marginTop: 40 }}>Loading leaderboard...</p>
        ) : leaders.length === 0 ? (
          <div className="glass-card" style={{ padding: 48, textAlign: "center", marginTop: 24 }}>
            <p style={{ fontSize: "2.5rem", marginBottom: 12 }}>🏆</p>
            <p style={{ color: "var(--text-secondary)" }}>No entries yet. Be the first on the leaderboard!</p>
          </div>
        ) : (
          <div className="leaderboard-list">
            {leaders.map((entry, i) => (
              <div key={i} className="leaderboard-row" style={{ animationDelay: `${i * 50}ms`, animation: "slideUp 0.4s ease forwards" }}>
                <div className="leaderboard-rank">#{i + 1}</div>
                <div className="leaderboard-username">{entry.username}</div>
                <div className="leaderboard-wpm">{entry.bestWpm.toFixed(1)} WPM</div>
                <div className="leaderboard-accuracy">{entry.bestAccuracy.toFixed(1)}%</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
