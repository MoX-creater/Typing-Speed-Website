import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getProfile } from "../api";

export default function Profile({ user }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    getProfile()
      .then(({ data }) => setProfile(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, navigate]);

  if (loading) return <div className="page"><div className="container" style={{ textAlign: "center", color: "var(--text-secondary)" }}>Loading profile...</div></div>;
  if (!profile) return <div className="page"><div className="container" style={{ textAlign: "center" }}><p style={{ color: "var(--text-secondary)" }}>Could not load profile.</p><Link to="/" className="btn btn-primary" style={{ marginTop: 16, display: "inline-block" }}>Go Home</Link></div></div>;

  const { stats, recentSessions } = profile;

  return (
    <div className="page">
      <div className="container">
        <div className="profile-header">
          <div className="profile-avatar">{user.username[0].toUpperCase()}</div>
          <div className="profile-info">
            <h2>{user.username}</h2>
            <p>{user.email} · Joined {new Date(profile.user.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="profile-stats">
          <div className="glass-card profile-stat"><div className="stat-val">{stats.totalSessions}</div><div className="stat-lbl">Tests Taken</div></div>
          <div className="glass-card profile-stat"><div className="stat-val">{(stats.bestWpm || 0).toFixed(1)}</div><div className="stat-lbl">Best WPM</div></div>
          <div className="glass-card profile-stat"><div className="stat-val">{(stats.avgWpm || 0).toFixed(1)}</div><div className="stat-lbl">Avg WPM</div></div>
          <div className="glass-card profile-stat"><div className="stat-val">{(stats.avgAccuracy || 0).toFixed(1)}%</div><div className="stat-lbl">Avg Accuracy</div></div>
          <div className="glass-card profile-stat"><div className="stat-val">{(stats.bestAccuracy || 0).toFixed(1)}%</div><div className="stat-lbl">Best Accuracy</div></div>
          <div className="glass-card profile-stat"><div className="stat-val">{Math.round(stats.totalTimeSpent || 0)}s</div><div className="stat-lbl">Time Spent</div></div>
        </div>

        <h3 style={{ marginBottom: 16 }}>Recent Sessions</h3>
        {recentSessions.length === 0 ? (
          <div className="glass-card" style={{ padding: 32, textAlign: "center" }}>
            <p style={{ color: "var(--text-secondary)" }}>No sessions yet. <Link to="/">Take a test!</Link></p>
          </div>
        ) : (
          <div className="glass-card" style={{ overflow: "auto" }}>
            <table className="history-table">
              <thead><tr><th>Date</th><th>WPM</th><th>Accuracy</th><th>Duration</th></tr></thead>
              <tbody>
                {recentSessions.map((s) => (
                  <tr key={s._id}>
                    <td style={{ fontFamily: "var(--font-sans)" }}>{new Date(s.createdAt).toLocaleString()}</td>
                    <td style={{ color: "var(--accent-secondary)" }}>{s.wpm.toFixed(1)}</td>
                    <td style={{ color: s.accuracy >= 95 ? "var(--success)" : "var(--text-primary)" }}>{s.accuracy.toFixed(1)}%</td>
                    <td>{s.duration}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
