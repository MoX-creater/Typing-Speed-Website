import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const q = query(
          collection(db, "sessions"),
          orderBy("wpm", "desc"),
          limit(100)
        );
        
        const querySnapshot = await getDocs(q);
        const uniqueUsers = new Map();
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const uid = data.userId;
          // Since we ordered by WPM desc, the first time we see a user, it's their highest WPM
          if (!uniqueUsers.has(uid)) {
            uniqueUsers.set(uid, {
              uid,
              username: data.username || "Anonymous",
              bestWpm: data.wpm,
              bestAccuracy: data.accuracy
            });
          }
        });
        
        const topLeaders = Array.from(uniqueUsers.values()).slice(0, 10);
        setLeaders(topLeaders);
      } catch (error) {
        console.error("Error fetching leaderboard from Firestore", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
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
                <Link to={`/profile/${entry.uid}`} className="leaderboard-username">{entry.username}</Link>
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
