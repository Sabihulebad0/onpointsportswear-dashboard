import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import "./ResetPassword.css";

export default function ResetPassword() {
  const { resetPassword, submitting, error, message, user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(params.get("token") || "");
  const [password, setPassword] = useState("");

  useEffect(() => {
    setToken(params.get("token") || "");
  }, [params]);

  const onSubmit = async (event) => {
    event.preventDefault();
    try {
      const data = await resetPassword(token, password);
      const next = data.user?.role === "delivery" ? "/orders" : "/";
      if (data.user) navigate(next);
    } catch {
      /* error is stored in Redux */
    }
  };

  return (
    <AuthLayout>
      <form className="reset-form" onSubmit={onSubmit}>
        <h1>Reset password</h1>
        {error ? <div className="reset-form__alert">{error}</div> : null}
        {message ? <div className="reset-form__ok">{message}</div> : null}
        <label>
          Reset token
          <input value={token} onChange={(event) => setToken(event.target.value)} required />
        </label>
        <label>
          New password
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            minLength={6}
            required
          />
        </label>
        <button className="reset-form__submit" type="submit" disabled={submitting}>
          {submitting ? "Please wait..." : "Update password"}
        </button>
        {user ? <p className="reset-form__copy">You are signed in and can continue to the panel.</p> : null}
        <Link className="reset-form__back" to="/login">
          Back to login
        </Link>
      </form>
    </AuthLayout>
  );
}
