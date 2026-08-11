import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Scatter } from "recharts";
import { generateTestSummary } from "../api";
import { getAuthToken } from "../../lib/authToken";

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

function buildSummaryPayload(results) {
  const avgWpmOverTime = results.avgWpmOverTime?.length
    ? results.avgWpmOverTime
    : (results.samples || []).map((sample) => Number(sample.wpm)).filter((wpm) => wpm > 0);

  return {
    avgWpmOverTime,
    accuracyByCharClass: results.accuracyByCharClass || {},
    finalWpm: Number(results.finalWpm ?? results.wpm),
    finalAccuracy: Number(results.finalAccuracy ?? results.accuracy),
    duration: results.duration,
    testType: results.testType,
  };
}

export default function Results({ user, authReady = false }) {
  const [results, setResults] = useState(null);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

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

  useEffect(() => {
    let cancelled = false;

    async function fetchSummary() {
      if (!results || !user || !authReady) {
        return;
      }

      setSummaryLoading(true);
      setSummaryError("");

      const token = await getAuthToken();
      if (!token) {
        setSummaryError("Sign in again to see your AI performance summary.");
        setSummaryLoading(false);
        return;
      }

      try {
        const { data } = await generateTestSummary(buildSummaryPayload(results));
        if (!cancelled) {
          setSummary(data.summary);
          setSummaryError("");
        }
      } catch (err) {
        if (!cancelled) {
          if (!err.response) {
            setSummaryError(
              "Could not reach the server. Make sure the backend is running (npm start in server/)."
            );
          } else if (err.response.status === 404) {
            setSummaryError(
              "Summary endpoint not found — restart the server to load the latest routes."
            );
          } else if (err.response.status === 401) {
            setSummaryError("Session expired. Please sign in again.");
          } else {
            setSummaryError(err.response?.data?.error || "Could not load performance summary.");
          }
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
  }, [results, user, authReady]);

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
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={graphData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="second" tick={{ fill: grayText, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" domain={[0, "dataMax + 10"]} tick={{ fill: grayText, fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                <YAxis yAxisId="right" orientation="right" domain={[0, "dataMax + 2"]} tick={{ fill: errorColor, fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<CustomTooltip />} contentStyle={{ background: "rgba(15, 23, 42, 0.96)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }} labelStyle={{ color: "#fff" }} />
                <Line type="monotone" dataKey="rawWpm" yAxisId="left" stroke="rgba(255,255,255,0.35)" strokeWidth={1} dot={false} activeDot={false} />
                <Line type="monotone" dataKey="wpm" yAxisId="left" stroke={accent} strokeWidth={2.5} dot={false} activeDot={false} />
                <Line type="monotone" dataKey="smoothedWpm" yAxisId="left" stroke={accent} strokeWidth={1.5} strokeDasharray="6 6" dot={false} activeDot={false} />
                <Scatter data={graphData.filter((point) => point.errors > 0)} yAxisId="right" fill={errorColor} shape="x" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {(user || summaryLoading || summary || summaryError) && (
          <div className="results-summary-ai">
            <span className="results-summary-ai-label">Performance summary</span>
            {!user && (
              <Link to="/login">Sign in to get an AI performance summary</Link>
            )}
            {user && summaryLoading && (
              <p className="results-summary-ai-text muted">Generating your summary…</p>
            )}
            {user && !summaryLoading && summary && (
              <p className="results-summary-ai-text">{summary}</p>
            )}
            {user && !summaryLoading && !summary && summaryError && (
              <p className="results-summary-ai-text muted">{summaryError}</p>
            )}
          </div>
        )}

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

        <div className="results-footer-row">
          <div className="results-footer-note">
            {user ? (
              <span>Result saved to your account.</span>
            ) : (
              <Link to="/login">Sign in to save your result</Link>
            )}
          </div>
          <Link to="/" className="btn btn-secondary results-new-test-btn">New test</Link>
        </div>
      </div>
    </div>
  );
}
