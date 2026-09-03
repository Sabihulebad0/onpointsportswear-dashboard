import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import "./ForgotPassword.css";

export default function ForgotPassword() {
  const { forgotPassword, submitting, error, message, clearFeedback } = useAuth();
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");

  useEffect(() => {
    clearFeedback();
  }, [clearFeedback]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setResetToken("");
    try {
      const data = await forgotPassword(email);
      setResetToken(data.resetToken || "");
    } catch {
      /* error is stored in Redux */
    }
  };

  return (
    <AuthLayout>
      <form className="forgot-form" onSubmit={onSubmit}>
        <h1>Forgot password</h1>
        <p className="forgot-form__copy">Enter the email for your account.</p>
        {error ? <div className="forgot-form__alert">{error}</div> : null}
        {message ? <div className="forgot-form__ok">{message}</div> : null}
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
        <button className="forgot-form__submit" type="submit" disabled={submitting}>
          {submitting ? "Please wait..." : "Send reset link"}
        </button>
        {resetToken ? (
          <p className="forgot-form__token">
            Reset token (dev): <Link to={`/reset-password?token=${resetToken}`}>{resetToken}</Link>
          </p>
        ) : null}
        <Link className="forgot-form__back" to="/login">
          Back to login
        </Link>
      </form>
    </AuthLayout>
  );
}
