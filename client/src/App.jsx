import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import Navbar from "./components/Navbar";
import TypingTest from "./components/TypingTest";
import Results from "./components/Results";
import Login from "./components/Login";
import Register from "./components/Register";
import Profile from "./components/Profile";
import Leaderboard from "./components/Leaderboard";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const stored = localStorage.getItem("user");
    if (token && stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  const handleLogin = async (userData, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    
    // Add user to Firestore
    try {
      await setDoc(doc(db, "users", userData.uid || userData._id), {
        uid: userData.uid || userData._id,
        displayName: userData.displayName || userData.username,
        email: userData.email,
        createdAt: new Date()
      }, { merge: true });
    } catch (error) {
      console.error("Error adding user to Firestore", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <BrowserRouter>
      <Navbar user={user} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<TypingTest user={user} />} />
        <Route path="/results" element={<Results user={user} />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/register" element={<Register onLogin={handleLogin} />} />
        <Route path="/profile" element={<Profile user={user} />} />
        <Route path="/profile/:userId" element={<Profile user={user} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
