import { Link, useLocation } from "react-router-dom";

export default function Navbar({ user, onLogout }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? "active" : "";

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">TypePulse</Link>
        <div className="navbar-links">
          <Link to="/" className={isActive("/")}>Test</Link>
          <Link to="/leaderboard" className={isActive("/leaderboard")}>Leaderboard</Link>
          {user ? (
            <>
              <Link to="/profile" className={isActive("/profile")}>Profile</Link>
              <button onClick={onLogout} className="btn-ghost">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className={isActive("/login")}>Login</Link>
              <Link to="/register" className={`btn btn-primary ${isActive("/register")}`} style={{ padding: "8px 20px", fontSize: "0.85rem" }}>Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
