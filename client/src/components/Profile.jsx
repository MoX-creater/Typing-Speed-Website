import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useFriends } from "../hooks/useFriends";

export default function Profile({ user }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { userId } = useParams();
  const { friendRequests, isFriend, friendRequestSent, sendFriendRequest, acceptFriendRequest, declineFriendRequest } = useFriends(userId, user);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    
    const fetchProfile = async () => {
      try {
        const profileUserId = userId || user.uid;
        const q = query(
          collection(db, "sessions"),
          where("userId", "==", profileUserId)
        );
        
        const querySnapshot = await getDocs(q);
        const sessions = [];
        querySnapshot.forEach((doc) => {
          sessions.push({ 
            _id: doc.id, 
            ...doc.data(), 
            createdAt: doc.data().createdAt?.toDate() || new Date() 
          });
        });
        
        sessions.sort((a, b) => b.createdAt - a.createdAt);
        
        let totalSessions = sessions.length;
        let bestWpm = 0;
        let totalWpm = 0;
        let bestAccuracy = 0;
        let totalAccuracy = 0;
        let totalTimeSpent = 0;
        
        sessions.forEach(s => {
          if (s.wpm > bestWpm) bestWpm = s.wpm;
          if (s.accuracy > bestAccuracy) bestAccuracy = s.accuracy;
          totalWpm += s.wpm;
          totalAccuracy += s.accuracy;
          totalTimeSpent += (s.duration || 30);
        });
        
        // Fetch user info from users collection
        const userDoc = await getDoc(doc(db, "users", profileUserId));
        const userData = userDoc.exists() ? userDoc.data() : { displayName: "Anonymous", email: "", createdAt: new Date() };
        
        setProfile({
          user: userData,
          stats: { 
            totalSessions, 
            bestWpm, 
            avgWpm: totalSessions > 0 ? totalWpm / totalSessions : 0, 
            avgAccuracy: totalSessions > 0 ? totalAccuracy / totalSessions : 0, 
            bestAccuracy, 
            totalTimeSpent 
          },
          recentSessions: sessions.slice(0, 15)
        });
      } catch (error) {
        console.error("Error fetching profile from Firestore", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, navigate, userId]);

  if (loading) return <div className="page"><div className="container" style={{ textAlign: "center", color: "var(--text-secondary)" }}>Loading profile...</div></div>;
  if (!profile) return <div className="page"><div className="container" style={{ textAlign: "center" }}><p style={{ color: "var(--text-secondary)" }}>Could not load profile.</p><Link to="/" className="btn btn-primary" style={{ marginTop: 16, display: "inline-block" }}>Go Home</Link></div></div>;

  const { stats, recentSessions } = profile;

  return (
    <div className="page">
      <div className="container">
        <div className="profile-header">
          <div className="profile-avatar">{(profile.user.displayName || "T")[0].toUpperCase()}</div>
          <div className="profile-info">
            <h2>{profile.user.displayName || "Typist"}</h2>
            <p>{profile.user.email} · Joined {new Date(profile.user.createdAt?.toDate ? profile.user.createdAt.toDate() : profile.user.createdAt).toLocaleDateString()}</p>
            {userId && userId !== user.uid && (
              <div style={{ marginTop: 8 }}>
                {isFriend ? (
                  <span style={{ color: "var(--success)" }}>Friends</span>
                ) : friendRequestSent ? (
                  <span style={{ color: "var(--text-secondary)" }}>Friend Request Sent</span>
                ) : (
                  <button className="btn btn-primary" onClick={sendFriendRequest}>Send Friend Request</button>
                )}
              </div>
            )}
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

        {!userId && friendRequests.length > 0 && (
          <div className="glass-card" style={{ marginBottom: 24 }}>
            <h3>Friend Requests</h3>
            {friendRequests.map(req => (
              <div key={req.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Link to={`/profile/${req.from}`}>{req.fromUser.displayName}</Link>
                <div>
                  <button className="btn btn-success" onClick={() => acceptFriendRequest(req.id, req.from)}>Accept</button>
                  <button className="btn btn-danger" onClick={() => declineFriendRequest(req.id)} style={{ marginLeft: 8 }}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}

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
                    <td style={{ color: "var(--text-primary)" }}>{s.wpm.toFixed(1)}</td>
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
