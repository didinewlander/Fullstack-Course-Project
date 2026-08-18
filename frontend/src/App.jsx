import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import { USER_ROLES } from "./constants/roles";

// vendor
import ProductCatalog from "./pages/dashboards/vendor/ProductCatalog";
import NewOrder from "./pages/dashboards/vendor/NewOrder";
import OrderList from "./pages/dashboards/vendor/OrderList";

// supplier
import SupplierOverview from "./pages/dashboards/supplier/SupplierOverview";
import SupplierProducts from "./pages/dashboards/supplier/SupplierProducts";
import SupplierInventory from "./pages/dashboards/supplier/SupplierInventory";
import SupplierOrders from "./pages/dashboards/supplier/SupplierOrders";

// manager
import ManagerOverview from "./pages/dashboards/manager/ManagerOverview";
import ManagerOrders from "./pages/dashboards/manager/ManagerOrders";
import ManagerProducts from "./pages/dashboards/manager/ManagerProducts";
import ManagerInventory from "./pages/dashboards/manager/ManagerInventory";
import ManagerUsers from "./pages/dashboards/manager/ManagerUsers";

// shared by every role - the endpoints behind them already scope themselves
// to the caller, so one page serves all three
import DeliveriesPage from "./pages/dashboards/shared/DeliveriesPage";
import InvoicesPage from "./pages/dashboards/shared/InvoicesPage";
import RoleGuide from "./pages/dashboards/shared/RoleGuide";
import NotFound from "./pages/NotFound";
import "./App.css";

const { VENDOR, SUPPLIER, LOGISTICS_MANAGER } = USER_ROLES;

// Every private route names the role(s) allowed on it, so a logged in user of
// the wrong role is redirected to their own dashboard instead of being shown a
// page whose API calls would all 403 (see ProtectedRoute.jsx).
const guarded = (roles, element) => (
  <ProtectedRoute allowedRoles={roles}>{element}</ProtectedRoute>
);

function App() {
  return (
    <Routes>
      {/* public pages, anyone can open these */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* ---------- vendor ---------- */}
      <Route
        path="/dashboard/vendor"
        element={guarded([VENDOR], <ProductCatalog />)}
      />
      <Route
        path="/dashboard/vendor/new-order"
        element={guarded([VENDOR], <NewOrder />)}
      />
      <Route
        path="/dashboard/vendor/orders"
        element={guarded([VENDOR], <OrderList />)}
      />
      <Route
        path="/dashboard/vendor/deliveries"
        element={guarded([VENDOR], <DeliveriesPage />)}
      />
      <Route
        path="/dashboard/vendor/invoices"
        element={guarded([VENDOR], <InvoicesPage />)}
      />
      <Route
        path="/dashboard/vendor/guide"
        element={guarded([VENDOR], <RoleGuide />)}
      />

      {/* ---------- supplier ---------- */}
      <Route
        path="/dashboard/supplier"
        element={guarded([SUPPLIER], <SupplierOverview />)}
      />
      <Route
        path="/dashboard/supplier/products"
        element={guarded([SUPPLIER], <SupplierProducts />)}
      />
      <Route
        path="/dashboard/supplier/inventory"
        element={guarded([SUPPLIER], <SupplierInventory />)}
      />
      <Route
        path="/dashboard/supplier/orders"
        element={guarded([SUPPLIER], <SupplierOrders />)}
      />
      <Route
        path="/dashboard/supplier/deliveries"
        element={guarded([SUPPLIER], <DeliveriesPage />)}
      />
      <Route
        path="/dashboard/supplier/invoices"
        element={guarded([SUPPLIER], <InvoicesPage />)}
      />
      <Route
        path="/dashboard/supplier/guide"
        element={guarded([SUPPLIER], <RoleGuide />)}
      />

      {/* ---------- logistics manager ---------- */}
      <Route
        path="/dashboard/manager"
        element={guarded([LOGISTICS_MANAGER], <ManagerOverview />)}
      />
      <Route
        path="/dashboard/manager/orders"
        element={guarded([LOGISTICS_MANAGER], <ManagerOrders />)}
      />
      <Route
        path="/dashboard/manager/products"
        element={guarded([LOGISTICS_MANAGER], <ManagerProducts />)}
      />
      <Route
        path="/dashboard/manager/inventory"
        element={guarded([LOGISTICS_MANAGER], <ManagerInventory />)}
      />
      <Route
        path="/dashboard/manager/deliveries"
        element={guarded([LOGISTICS_MANAGER], <DeliveriesPage />)}
      />
      <Route
        path="/dashboard/manager/invoices"
        element={guarded([LOGISTICS_MANAGER], <InvoicesPage />)}
      />
      <Route
        path="/dashboard/manager/users"
        element={guarded([LOGISTICS_MANAGER], <ManagerUsers />)}
      />
      <Route
        path="/dashboard/manager/guide"
        element={guarded([LOGISTICS_MANAGER], <RoleGuide />)}
      />

      {/* default route, just send people to the login page */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
