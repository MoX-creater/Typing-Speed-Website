import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Results() {
  const [results, setResults] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("typingResults");
    if (saved) {
      try {
        setResults(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  if (!results) {
    return (
      <div className="page results-page">
        <div className="glass-card results-card" style={{ textAlign: "center" }}>
          <h2>No Results Found</h2>
          <Link to="/" className="btn btn-primary">Take a Test</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page results-page">
      <div className="glass-card results-card">
        <h2>Test Results</h2>
        <div className="results-grid">
          <div className="result-stat">
            <span className="result-label">WPM</span>
            <span className="result-value">{results.wpm}</span>
          </div>
          <div className="result-stat">
            <span className="result-label">Accuracy</span>
            <span className="result-value">{results.accuracy}%</span>
          </div>
          <div className="result-stat">
            <span className="result-label">Time</span>
            <span className="result-value">{results.duration}s</span>
          </div>
          <div className="result-stat">
            <span className="result-label">Characters</span>
            <span className="result-value">{results.correctChars}/{results.totalChars}</span>
          </div>
        </div>
        <div className="results-actions" style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <Link to="/" className="btn btn-primary">Test Again</Link>
          <Link to="/leaderboard" className="btn btn-secondary">Leaderboard</Link>
        </div>
      </div>
    </div>
  );
}
