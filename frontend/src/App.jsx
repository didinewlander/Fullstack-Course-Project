import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/dashboards/Dashboard";
import ProductCatalog from "./pages/dashboards/vendor/ProductCatalog";
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";

function App() {
  return (
    <Routes>
      {/* public pages, anyone can open these */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* private pages, only for logged in users (see ProtectedRoute.jsx) */}
      <Route
        path="/dashboard/manager"
        element={
          <ProtectedRoute>
            <Dashboard title="Logistics Manager Dashboard" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/vendor"
        element={
          <ProtectedRoute>
            <ProductCatalog />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/supplier"
        element={
          <ProtectedRoute>
            <Dashboard title="Supplier Dashboard" />
          </ProtectedRoute>
        }
      />

      {/* default route, just send people to the login page */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
