import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function Results({ user }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("typingResults");
    if (stored) {
      try { setData(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  if (!data) {
    return (
      <div className="page">
        <div className="container results-page">
          <h1>No Results Found</h1>
          <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>Take a typing test first to see your results.</p>
          <Link to="/" className="btn btn-primary">Start Typing</Link>
        </div>
      </div>
    );
  }

  const rating = data.wpm >= 80 ? "Lightning Fast ⚡" : data.wpm >= 60 ? "Impressive 🔥" : data.wpm >= 40 ? "Good Job 👍" : "Keep Practicing 💪";

  return (
    <div className="page">
      <div className="container results-page">
        <h1>{rating}</h1>

        <div className="results-grid">
          <div className="glass-card result-card highlight">
            <div className="result-value">{data.wpm}</div>
            <div className="result-label">Words Per Minute</div>
          </div>
          <div className="glass-card result-card">
            <div className="result-value" style={{ color: parseFloat(data.accuracy) >= 95 ? "var(--success)" : parseFloat(data.accuracy) >= 80 ? "var(--warning)" : "var(--error)" }}>
              {data.accuracy}%
            </div>
            <div className="result-label">Accuracy</div>
          </div>
          <div className="glass-card result-card">
            <div className="result-value">{data.correctWords || "—"}</div>
            <div className="result-label">Correct Words</div>
          </div>
          <div className="glass-card result-card">
            <div className="result-value">{data.duration || 30}s</div>
            <div className="result-label">Duration</div>
          </div>
        </div>

        {data.correctChars > 0 && (
          <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-around", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              <span>Correct chars: <strong style={{ color: "var(--success)" }}>{data.correctChars}</strong></span>
              <span>Total chars: <strong style={{ color: "var(--text-primary)" }}>{data.totalChars}</strong></span>
              <span>Errors: <strong style={{ color: "var(--error)" }}>{data.totalChars - data.correctChars}</strong></span>
            </div>
          </div>
        )}

        <div className="results-actions">
          <Link to="/" className="btn btn-primary">Try Again</Link>
          <Link to="/leaderboard" className="btn btn-secondary">Leaderboard</Link>
          {!user && <Link to="/register" className="btn btn-secondary">Sign Up to Save</Link>}
        </div>
      </div>
    </div>
  );
}
