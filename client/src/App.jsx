import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { signOutUser } from "../lib/auth";
import { isValidToken } from "../lib/authToken";
import Navbar from "./components/Navbar";
import TypingTest from "./components/TypingTest";
import Results from "./components/Results";
import Login from "./components/Login";
import Register from "./components/Register";
import Profile from "./components/Profile";
import Leaderboard from "./components/Leaderboard";
import MultiplayerLobby from "./components/MultiplayerLobby";
import About from "./components/About";
import Privacy from "./components/Privacy";

function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
        };
        localStorage.setItem("token", idToken);
        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
      }
      setAuthReady(true);
    });

    return unsubscribe;
  }, []);

  const handleLogin = async (userData, token) => {
    const normalizedUser = {
      uid: userData.uid || userData._id || userData.id,
      email: userData.email,
      displayName: userData.displayName || userData.username,
    };

    if (isValidToken(token)) {
      localStorage.setItem("token", token);
    }
    localStorage.setItem("user", JSON.stringify(normalizedUser));
    setUser(normalizedUser);
    
    // Add user to Firestore
    try {
      await setDoc(doc(db, "users", normalizedUser.uid), {
        uid: normalizedUser.uid,
        displayName: normalizedUser.displayName,
        email: normalizedUser.email,
        createdAt: new Date()
      }, { merge: true });
    } catch (error) {
      console.error("Error adding user to Firestore", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOutUser();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
    }
  };

  return (
    <BrowserRouter>
      <Navbar user={user} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<TypingTest user={user} authReady={authReady} />} />
        <Route path="/results" element={<Results user={user} authReady={authReady} />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/multiplayer" element={<MultiplayerLobby user={user} />} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/register" element={<Register onLogin={handleLogin} />} />
        <Route path="/profile" element={<Profile user={user} />} />
        <Route path="/profile/:userId" element={<Profile user={user} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
