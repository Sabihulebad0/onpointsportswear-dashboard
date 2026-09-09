import { Link } from "react-router-dom";
import "./AuthLayout.css";

export default function AuthLayout({ children }) {
  return (
    <div className="auth-page">
      <div className="auth-layout">
        <section className="auth-layout__hero" aria-hidden="true">
          <img src="/login-hero.png?v=3" alt="" />
        </section>
        <section className="auth-layout__panel">
          <div className="auth-layout__inner">{children}</div>
        </section>
      </div>
    </div>
  );
}

export function AuthLinks() {
  return (
    <div className="auth-links">
      <Link to="/forgot-password">Forgot your password</Link>
      {/* <Link to="/register">Create account</Link> */}
    </div>
  );
}
