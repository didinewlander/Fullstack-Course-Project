import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getDashboardPathByRole } from "../utils/roleRoutes";

// this component wraps pages that only logged in users can see
// usage: <ProtectedRoute allowedRoles={[USER_ROLES.VENDOR]}><Page /></ProtectedRoute>
//
// It checks two separate things:
//   1. is anyone logged in at all
//   2. is THIS role allowed on THIS page
//
// (2) is new. Without it a Vendor could simply type /dashboard/manager and
// get the manager UI. The API would still refuse the manager-only requests,
// but the page should never have opened in the first place.
function ProtectedRoute({ children, allowedRoles }) {
  const { user, isBootstrapped } = useAuth();

  // On a page reload we start with no user and an in-flight /auth/refresh.
  // Redirecting now would bounce a perfectly valid session to the login
  // page, so wait for the restore attempt to settle first.
  if (!isBootstrapped) {
    return <p className="route-loading">Loading…</p>;
  }

  // no user logged in -> send them to the login page instead
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // logged in, but this page belongs to a different role -> send them to
  // their own dashboard rather than showing an error
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDashboardPathByRole(user.role)} replace />;
  }

  // user is logged in and allowed here, show the page they asked for
  return children;
}

export default ProtectedRoute;
