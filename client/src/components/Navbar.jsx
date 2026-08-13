import { Link, useLocation } from "react-router-dom";

export default function Navbar({ user, onLogout }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? "active" : "";

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">TYPE SPEED</Link>
        <div className="navbar-links center-links">
          <Link to="/" className={isActive("/")}>Test</Link>
          <Link to="/leaderboard" className={isActive("/leaderboard")}>Leaderboard</Link>
          <Link to="/multiplayer" className={isActive("/multiplayer")}>Multiplayer</Link>
          <Link to="/about" className={isActive("/about")}>About</Link>
        </div>
        <div className="navbar-actions">
          {user ? (
            <>
              <Link to="/profile" className="icon-btn" title="Profile">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </Link>
              <button onClick={onLogout} className="icon-btn" title="Logout">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              </button>
            </>
          ) : (
            <Link to="/login" className="icon-btn" title="Login">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
