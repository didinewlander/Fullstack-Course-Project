import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { USER_ROLES } from "../constants/roles";
import NotificationBell from "./NotificationBell";
import GlobalSearch from "./GlobalSearch";
import "./DashboardLayout.css";

// Header + nav + logout, shared by all three role dashboards. Replaces the
// vendor-only VendorNav so the manager and supplier areas get the same shell
// instead of each page rolling its own header.
const NAV_BY_ROLE = {
  [USER_ROLES.VENDOR]: {
    title: "Vendor Dashboard",
    links: [
      { to: "/dashboard/vendor", label: "Catalog", end: true },
      { to: "/dashboard/vendor/new-order", label: "New Order" },
      { to: "/dashboard/vendor/orders", label: "My Orders" },
      { to: "/dashboard/vendor/deliveries", label: "Deliveries" },
      { to: "/dashboard/vendor/invoices", label: "Invoices" },
    ],
  },

  [USER_ROLES.SUPPLIER]: {
    title: "Supplier Dashboard",
    links: [
      { to: "/dashboard/supplier", label: "Overview", end: true },
      { to: "/dashboard/supplier/products", label: "My Products" },
      { to: "/dashboard/supplier/inventory", label: "Inventory" },
      { to: "/dashboard/supplier/orders", label: "Incoming Orders" },
      { to: "/dashboard/supplier/deliveries", label: "Deliveries" },
      { to: "/dashboard/supplier/invoices", label: "Invoices" },
    ],
  },

  [USER_ROLES.LOGISTICS_MANAGER]: {
    title: "Logistics Manager Dashboard",
    links: [
      { to: "/dashboard/manager", label: "Overview", end: true },
      { to: "/dashboard/manager/orders", label: "Orders" },
      { to: "/dashboard/manager/products", label: "Products" },
      { to: "/dashboard/manager/inventory", label: "Inventory" },
      { to: "/dashboard/manager/deliveries", label: "Deliveries" },
      { to: "/dashboard/manager/invoices", label: "Invoices" },
      { to: "/dashboard/manager/users", label: "Users" },
    ],
  },
};

function DashboardLayout({ children, heading }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const nav = NAV_BY_ROLE[user?.role];

  async function handleLogout() {
    // revokes the refresh token server-side, then clears local state
    await logout();
    navigate("/login");
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-inner">
          <div className="dashboard-brand">
            <span className="dashboard-mark" aria-hidden="true">
              DH
            </span>
            <div>
              <p className="dashboard-title">{nav?.title ?? "Dashboard"}</p>
              <p className="dashboard-user">
                {user?.username} · {user?.role}
              </p>
            </div>
          </div>

          <div className="dashboard-header-actions">
            <GlobalSearch />
            <NotificationBell />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {nav && (
        <nav className="dashboard-nav">
          <div className="dashboard-nav-inner">
            {nav.links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => (isActive ? "active" : undefined)}
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}

      <main className="dashboard-main">
        {heading && <h2>{heading}</h2>}
        {children}
      </main>
    </div>
  );
}

export default DashboardLayout;
