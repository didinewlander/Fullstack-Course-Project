import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getDashboardPathByRole } from "../utils/roleRoutes";
import "./Auth.css";

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  // all the register fields in one object, like in the Login page
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "vendor", // default value for the select, so it is never empty
  });

  const [errors, setErrors] = useState({});

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function validate() {
    const newErrors = {};

    if (!form.name.trim()) {
      newErrors.name = "Name is required";
    }

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

    if (!form.role) {
      newErrors.role = "Please pick a role";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    // TODO: this should call the real register API once issue #5 + #4 are done
    const newUser = register(form);

    // after register we log the user in right away and send them to their dashboard
    navigate(getDashboardPathByRole(newUser.role));
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Register</h1>

        <form onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              className={errors.name ? "error" : ""}
            />
            {errors.name && <p className="auth-error-text">{errors.name}</p>}
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

          <div className="auth-field">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              name="role"
              value={form.role}
              onChange={handleChange}
              className={errors.role ? "error" : ""}
            >
              <option value="vendor">Vendor</option>
              <option value="supplier">Supplier</option>
              <option value="manager">Logistics Manager</option>
            </select>
            {errors.role && <p className="auth-error-text">{errors.role}</p>}
          </div>

          <button type="submit" className="auth-submit">
            Register
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
