import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getDashboardPathByRole, hasDashboard } from "../utils/roleRoutes";
import AuthShowcase from "../components/AuthShowcase";
import "./Auth.css";

// matches the server rule in backend/utils/usersUtils.js (validatePassword).
// this used to be 6, so a 6 or 7 character password passed here and then
// failed on the server with a confusing error.
const MIN_PASSWORD_LENGTH = 8;

// same inline-SVG approach as AuthShowcase - the project has no icon library
const glyph = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: "false",
};

function MailIcon({ className }) {
  return (
    <svg {...glyph} className={className}>
      <rect x="3" y="5.2" width="18" height="13.6" rx="2.6" />
      <path d="m4 7.6 6.9 4.8a2 2 0 0 0 2.2 0L20 7.6" />
    </svg>
  );
}

function LockIcon({ className }) {
  return (
    <svg {...glyph} className={className}>
      <rect x="4.6" y="10.2" width="14.8" height="10.2" rx="2.6" />
      <path d="M8.2 10.2V7.6a3.8 3.8 0 0 1 7.6 0v2.6" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg {...glyph}>
      <path d="M2.6 12S6.1 5.8 12 5.8 21.4 12 21.4 12 17.9 18.2 12 18.2 2.6 12 2.6 12Z" />
      <circle cx="12" cy="12" r="2.9" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg {...glyph}>
      <path d="m3.5 3.5 17 17" />
      <path d="M10.6 6.1a9.9 9.9 0 0 1 1.4-.1c5.9 0 9.4 6 9.4 6a17 17 0 0 1-3.3 4" />
      <path d="M6.3 8A16.7 16.7 0 0 0 2.6 12s3.5 6.2 9.4 6.2a9.4 9.4 0 0 0 3.5-.7" />
      <path d="M9.9 10.3a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg {...glyph}>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 7.4v5.2" />
      <path d="M12 16.3h.01" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg {...glyph} strokeWidth={1.9}>
      <path d="M4.5 12h14" />
      <path d="m12.8 6.2 5.8 5.8-5.8 5.8" />
    </svg>
  );
}

function Login() {
  const { login, user, isBootstrapped, isSubmitting, error } = useAuth();
  const navigate = useNavigate();

  // one state object for both form fields, easier to manage
  const [form, setForm] = useState({ email: "", password: "" });

  // this will hold error messages, one per field
  const [errors, setErrors] = useState({});

  // toggled by the eye button inside the password field
  const [showPassword, setShowPassword] = useState(false);

  // already signed in (e.g. opened /login on a live session) -> go straight
  // to the right dashboard instead of asking for credentials again.
  //
  // hasDashboard guards the redirect: an unrecognised role resolves to
  // "/login", and redirecting /login to /login is an infinite loop. Showing
  // the form is the safe way out of that state.
  if (isBootstrapped && user && hasDashboard(user.role)) {
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
    <div className="auth-split">
      {/*
        The form is first in the DOM so it is what a phone and a screen reader
        reach first; CSS grid moves it to the right on wide screens.
      */}
      <main className="auth-panel">
        <div className="auth-panel-inner">
          <div className="auth-panel-brand">
            <span className="auth-mark" aria-hidden="true">
              DH
            </span>
            <span>Do-Hook-In</span>
          </div>

          <h1>Welcome back</h1>
          <p className="auth-subtitle">
            Sign in to your logistics workspace.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <div className="auth-control">
                <MailIcon className="auth-control-icon" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={handleChange}
                  className={errors.email ? "error" : ""}
                  aria-invalid={errors.email ? "true" : undefined}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
              </div>
              {errors.email && (
                <p className="auth-error-text" id="email-error">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <div className="auth-control">
                <LockIcon className="auth-control-icon" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  className={errors.password ? "has-reveal error" : "has-reveal"}
                  aria-invalid={errors.password ? "true" : undefined}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                />
                <button
                  type="button"
                  className="auth-reveal"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.password && (
                <p className="auth-error-text" id="password-error">
                  {errors.password}
                </p>
              )}
            </div>

            {/* whatever the API said went wrong, e.g. INVALID_CREDENTIALS */}
            {error && (
              <p className="auth-error-banner" role="alert">
                <AlertIcon />
                <span>{error.message}</span>
              </p>
            )}

            <button type="submit" className="auth-submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="auth-spinner" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowIcon />
                </>
              )}
            </button>
          </form>

          <div className="auth-panel-footer">
            <p className="auth-switch">
              Don't have an account? <Link to="/register">Register here</Link>
            </p>
            <p className="auth-panel-hint">
              New accounts start as Vendor accounts. Manager and supplier
              access is granted by a logistics manager.
            </p>
          </div>
        </div>
      </main>

      <AuthShowcase />
    </div>
  );
}

export default Login;
