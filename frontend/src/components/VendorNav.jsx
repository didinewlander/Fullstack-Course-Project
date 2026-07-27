import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import "./VendorNav.css";

// shared header + nav for all vendor pages (issue #12)
// pulled out of ProductCatalog so Catalog/New Order/My Orders don't each
// duplicate the welcome message + logout button
function VendorNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="vendor-nav">
      <div>
        <h1>Vendor Dashboard</h1>
        <p>Welcome, {user?.name}!</p>
        <nav className="vendor-nav-links">
          <NavLink
            to="/dashboard/vendor"
            end
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            Catalog
          </NavLink>
          <NavLink
            to="/dashboard/vendor/new-order"
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            New Order
          </NavLink>
          <NavLink
            to="/dashboard/vendor/orders"
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            My Orders
          </NavLink>
        </nav>
      </div>
      <button type="button" onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}

export default VendorNav;
