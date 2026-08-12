import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../api";
import { signInWithGoogle } from "../../lib/auth";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      const user = await signInWithGoogle();

      if (!user) return;

      const idToken = await user.getIdToken();
      onLogin(user, idToken);
      navigate("/");

    } catch (err) {
      setError("Google login failed");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await login({ email, password });
      onLogin(data.user, data.token);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-page">
      <div className="glass-card auth-card">
        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Sign in to track your progress</p>
        {error && <div className="auth-error">{error}</div>}
        <form className="auth-form" onSubmit={handleSubmit}>
          <input className="input-field" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="input-field" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
          <div className="auth-divider">OR</div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            Sign in with Google
          </button>
        </form>
        <p className="auth-switch">
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
