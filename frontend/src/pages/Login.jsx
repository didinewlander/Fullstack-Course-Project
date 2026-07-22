import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getDashboardPathByRole } from "../utils/roleRoutes";
import "./Auth.css";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // one state object for both form fields, easier to manage
  const [form, setForm] = useState({ email: "", password: "" });

  // this will hold error messages, one per field
  const [errors, setErrors] = useState({});

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
    } else if (form.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);

    // form is valid only if newErrors object is empty
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!validate()) {
      return; // stop here, do not submit, errors are already shown
    }

    // TODO: this should call the real login API once issue #5 + #4 are done
    const loggedInUser = login(form);

    // send the user straight to the dashboard that matches their role
    navigate(getDashboardPathByRole(loggedInUser.role));
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Login</h1>

        <form onSubmit={handleSubmit} noValidate>
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

          <button type="submit" className="auth-submit">
            Login
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
