import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import AuthLayout, { AuthLinks } from "../components/AuthLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import logo from "../assets/logo.png";
import "./Login.css";

export default function Login() {
  const { token, canAccessAdmin, user, login, submitting, error, clearFeedback } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@gmail.com");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    clearFeedback();
  }, [clearFeedback]);

  if (token && canAccessAdmin) {
    return <Navigate to={user?.role === "delivery" ? "/orders" : "/"} replace />;
  }

  const onSubmit = async (event) => {
    event.preventDefault();
    try {
      const signedIn = await login(email, password);
      navigate(signedIn.user?.role === "delivery" ? "/orders" : "/");
    } catch {
      /* error is stored in Redux */
    }
  };

  return (
    <AuthLayout>
      <form className="login-form" onSubmit={onSubmit}>
        <div className="login-form__head">
          <img className="login-form__logo" src={logo} alt="ON POINT SPORTSWEAR" />
          <h1>Login</h1>
        </div>
        {error ? <div className="login-form__alert">{error}</div> : null}
        <label>
          Email
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="admin@gmail.com"
            required
          />
        </label>
        <label>
          Password
          <div className="login-form__password">
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              required
            />
            <button
              type="button"
              className="login-form__eye"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                  <path d="M9.9 5.1A9.8 9.8 0 0112 5c5 0 9.3 3.1 11 7.5a11.7 11.7 0 01-4.2 4.8" />
                  <path d="M6.7 6.7C4.5 8.2 2.8 10.3 2 12.5c1.2 3 3.5 5.3 6.3 6.6 1.1.5 2.4.9 3.7.9 1 0 2-.2 2.9-.5" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </label>
        <button className="login-form__submit" type="submit" disabled={submitting}>
          {submitting ? "Please wait..." : "Login"}
        </button>
        <AuthLinks />
      </form>
    </AuthLayout>
  );
}
