import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Scatter } from "recharts";

const accent = "var(--accent)";
const errorColor = "#fb7185";
const grayText = "var(--text-muted)";

function formatTimeLabel(timestamp) {
  return new Date(timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function calculateSmoothedWpm(samples = [], windowSize = 5) {
  return samples.map((sample, index) => {
    const start = Math.max(0, index - (windowSize - 1));
    const window = samples.slice(start, index + 1).map((item) => item.wpm || 0);
    const average = window.reduce((sum, value) => sum + value, 0) / window.length;
    return { ...sample, smoothedWpm: Number(average.toFixed(1)) };
  });
}

function calculateConsistency(samples = []) {
  if (!samples.length) return 100;
  const values = samples.map((s) => s.wpm || 0);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (mean === 0) return 0;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  const stdev = Math.sqrt(variance);
  const cov = stdev / mean;
  return Math.max(0, Math.min(100, 100 - cov * 100)).toFixed(1);
}

function CustomTooltip(props) {
  const { active, payload, label } = props || {};
  if (!active || !payload || !payload.length) return null;

  // The hovered data point is in payload[0].payload
  const point = payload[0].payload || {};
  // Use a key tied to the data point to avoid React reusing stale nodes
  return (
    <div className="recharts-default-tooltip" style={{ padding: 8 }} key={point.second || label}>
      <div style={{ color: '#fff', fontWeight: 600 }}>{`Time: ${point.second}s`}</div>
      <div style={{ color: '#fff' }}>{`WPM: ${point.wpm ?? '-'} `}</div>
      <div style={{ color: '#fff' }}>{`Smoothed: ${point.smoothedWpm ?? '-'} `}</div>
      <div style={{ color: errorColor }}>{`Errors: ${point.errors ?? 0}`}</div>
    </div>
  );
}

export default function Results({ user }) {
  const [results, setResults] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("typingResults");
    if (saved) {
      try {
        setResults(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved results", e);
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

  const rawGraphData = results.samples || [];
  const graphData = calculateSmoothedWpm(rawGraphData);
  const consistency = calculateConsistency(rawGraphData);

  return (
    <div className="page results-page">
      <div className="glass-card results-card results-enhanced-card">
        <div className="results-header-row">
          <div className="results-summary-panel">
            <div className="results-summary-block">
              <span className="result-label">wpm</span>
              <span className="result-value accent-value">{results.wpm}</span>
            </div>
            <div className="results-summary-block">
              <span className="result-label">acc</span>
              <span className="result-value accent-value">{results.accuracy}%</span>
            </div>
          </div>

          <div className="results-graph-panel">
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={graphData} margin={{ top: 18, right: 24, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="second" tick={{ fill: grayText, fontSize: 12 }} axisLine={false} tickLine={false} label={{ value: "Time (s)", position: "insideBottom", dy: 14, fill: grayText, fontSize: 12 }} />
                <YAxis yAxisId="left" domain={[0, "dataMax + 10"]} tick={{ fill: grayText, fontSize: 12 }} axisLine={false} tickLine={false} label={{ value: "WPM", angle: -90, position: "insideLeft", fill: grayText, fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" domain={[0, "dataMax + 2"]} tick={{ fill: errorColor, fontSize: 12 }} axisLine={false} tickLine={false} label={{ value: "Errors", angle: 90, position: "insideRight", fill: errorColor, fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} contentStyle={{ background: "rgba(15, 23, 42, 0.96)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }} labelStyle={{ color: "#fff" }} />
                <Line type="monotone" dataKey="rawWpm" yAxisId="left" stroke="rgba(255,255,255,0.35)" strokeWidth={1} dot={false} activeDot={false} />
                <Line type="monotone" dataKey="wpm" yAxisId="left" stroke={accent} strokeWidth={3} dot={false} activeDot={false} />
                <Line type="monotone" dataKey="smoothedWpm" yAxisId="left" stroke={accent} strokeWidth={2} strokeDasharray="6 6" dot={false} activeDot={false} />
                <Scatter data={graphData.filter((point) => point.errors > 0)} yAxisId="right" fill={errorColor} shape="x" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="results-secondary-row">
          <div className="secondary-stat">
            <span className="stat-label">test type</span>
            <span className="stat-value">{results.testType}</span>
          </div>
          <div className="secondary-stat">
            <span className="stat-label">raw</span>
            <span className="stat-value">{results.rawWpm || "0"}</span>
          </div>
          <div className="secondary-stat">
            <span className="stat-label">characters</span>
            <span className="stat-value">{results.chars}</span>
          </div>
          <div className="secondary-stat">
            <span className="stat-label">consistency</span>
            <span className="stat-value">{consistency}%</span>
          </div>
          <div className="secondary-stat">
            <span className="stat-label">time</span>
            <span className="stat-value">{results.duration}s · {formatTimeLabel(results.timestamp)}</span>
          </div>
        </div>

        <div className="results-action-row">
          <button className="icon-action-btn" title="Next Test">▶</button>
          <button className="icon-action-btn" title="Restart Test">⟳</button>
          <button className="icon-action-btn" title="Report Issue">⚠</button>
          <button className="icon-action-btn" title="View Details">≡</button>
          <button className="icon-action-btn" title="Replay">⏪</button>
          <button className="icon-action-btn" title="Screenshot">🖼</button>
        </div>

        <div className="results-footer-note">
          {user ? (
            <span>Result saved to your account.</span>
          ) : (
            <Link to="/login">Sign in to save your result</Link>
          )}
        </div>
      </div>
    </div>
  );
}
