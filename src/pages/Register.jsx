import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import "./Register.css";

export default function Register() {
  const { token, canAccessAdmin, user, register, submitting, error, clearFeedback } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });

  useEffect(() => {
    clearFeedback();
  }, [clearFeedback]);

  if (token && canAccessAdmin) {
    return <Navigate to={user?.role === "delivery" ? "/orders" : "/"} replace />;
  }

  const onChange = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const onSubmit = async (event) => {
    event.preventDefault();
    try {
      await register(form);
      navigate("/orders");
    } catch {
      /* error is stored in Redux */
    }
  };

  return (
    <AuthLayout>
      <form className="register-form" onSubmit={onSubmit}>
        <h1>Create account</h1>
        <p className="register-form__copy">Delivery boy accounts can sign in and manage assigned orders.</p>
        {error ? <div className="register-form__alert">{error}</div> : null}
        <label>
          Name
          <input value={form.name} onChange={onChange("name")} required />
        </label>
        <label>
          Email
          <input value={form.email} onChange={onChange("email")} type="email" required />
        </label>
        <label>
          Phone
          <input value={form.phone} onChange={onChange("phone")} />
        </label>
        <label>
          Password
          <input value={form.password} onChange={onChange("password")} type="password" minLength={6} required />
        </label>
        <button className="register-form__submit" type="submit" disabled={submitting}>
          {submitting ? "Please wait..." : "Create account"}
        </button>
        <Link className="register-form__back" to="/login">
          Back to login
        </Link>
      </form>
    </AuthLayout>
  );
}
