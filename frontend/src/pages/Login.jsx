import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getDashboardPathByRole } from "../utils/roleRoutes";
import "./Auth.css";

// matches the server rule in backend/utils/usersUtils.js (validatePassword).
// this used to be 6, so a 6 or 7 character password passed here and then
// failed on the server with a confusing error.
const MIN_PASSWORD_LENGTH = 8;

function Login() {
  const { login, user, isBootstrapped, isSubmitting, error } = useAuth();
  const navigate = useNavigate();

  // one state object for both form fields, easier to manage
  const [form, setForm] = useState({ email: "", password: "" });

  // this will hold error messages, one per field
  const [errors, setErrors] = useState({});

  // already signed in (e.g. opened /login on a live session) -> go straight
  // to the right dashboard instead of asking for credentials again
  if (isBootstrapped && user) {
    return <Navigate to={getDashboardPathByRole(user.role)} replace />;
  }

  // runs every time the user types in an input
  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // basic validation, returns true if the form is ok
  function validate() {
    const newErrors = {};

    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!form.email.includes("@")) {
      newErrors.email = "Email looks wrong, check the @";
    }

    if (!form.password) {
      newErrors.password = "Password is required";
    } else if (form.password.length < MIN_PASSWORD_LENGTH) {
      newErrors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }

    setErrors(newErrors);

    // form is valid only if newErrors object is empty
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validate()) {
      return; // stop here, do not submit, errors are already shown
    }

    try {
      // real POST /api/v1/auth/login (issues #4, #5)
      const loggedInUser = await login(form);

      // send the user straight to the dashboard that matches their role
      navigate(getDashboardPathByRole(loggedInUser.role));
    } catch {
      // the message from the server is already in `error` from the store,
      // and is rendered below the form
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-mark" aria-hidden="true">DH</span>
          <span>Do-Hook-In</span>
        </div>

        <h1>Login</h1>
        <p className="auth-subtitle">Sign in to your logistics workspace.</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              className={errors.email ? "error" : ""}
            />
            {errors.email && <p className="auth-error-text">{errors.email}</p>}
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              className={errors.password ? "error" : ""}
            />
            {errors.password && (
              <p className="auth-error-text">{errors.password}</p>
            )}
          </div>

          {/* whatever the API said went wrong, e.g. INVALID_CREDENTIALS */}
          {error && <p className="auth-error-banner">{error.message}</p>}

          <button
            type="submit"
            className="auth-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in…" : "Login"}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
