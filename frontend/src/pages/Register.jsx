import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getDashboardPathByRole, hasDashboard } from "../utils/roleRoutes";
import "./Auth.css";

// Field names and rules mirror POST /api/v1/auth/register exactly:
//   - it takes { username, email, password }, not "name"
//   - username must be at least 3 characters
//   - password must be at least 8 characters
//   - there is NO role field. The server always creates a Vendor and
//     ignores any role sent in the body, so offering a role picker here
//     just lied to the user. Managers and suppliers are created by a
//     manager through POST /api/v1/users.
const MIN_USERNAME_LENGTH = 3;
const MIN_PASSWORD_LENGTH = 8;

function Register() {
  const { register, user, isBootstrapped, isSubmitting, error } = useAuth();
  const navigate = useNavigate();

  // all the register fields in one object, like in the Login page
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});

  // already signed in -> no reason to show the register form.
  // hasDashboard guards against an unrecognised role, which would otherwise
  // resolve to "/login" and bounce between the two pages forever.
  if (isBootstrapped && user && hasDashboard(user.role)) {
    return <Navigate to={getDashboardPathByRole(user.role)} replace />;
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function validate() {
    const newErrors = {};

    if (!form.username.trim()) {
      newErrors.username = "Username is required";
    } else if (form.username.trim().length < MIN_USERNAME_LENGTH) {
      newErrors.username = `Username must be at least ${MIN_USERNAME_LENGTH} characters`;
    }

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
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      // real POST /api/v1/auth/register (issues #4, #5) - the server signs
      // the new user in as well, returning a session alongside the user
      const newUser = await register(form);

      // after register we log the user in right away and send them to their dashboard
      navigate(getDashboardPathByRole(newUser.role));
    } catch {
      // e.g. EMAIL_ALREADY_EXISTS / USERNAME_ALREADY_EXISTS - the message
      // from the server is rendered below the form
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-mark" aria-hidden="true">DH</span>
          <span>Do-Hook-In</span>
        </div>

        <h1>Register</h1>
        <p className="auth-subtitle">Create a vendor account to start ordering.</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              className={errors.username ? "error" : ""}
            />
            {errors.username && (
              <p className="auth-error-text">{errors.username}</p>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
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
              value={form.password}
              onChange={handleChange}
              className={errors.password ? "error" : ""}
            />
            {errors.password && (
              <p className="auth-error-text">{errors.password}</p>
            )}
          </div>

          <p className="auth-note">
            New accounts are created as Vendor accounts. Manager and supplier
            accounts are set up by a logistics manager.
          </p>

          {/* whatever the API said went wrong, e.g. EMAIL_ALREADY_EXISTS */}
          {error && <p className="auth-error-banner">{error.message}</p>}

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating account…" : "Register"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
