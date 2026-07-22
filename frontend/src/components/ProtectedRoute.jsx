import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

// this component wraps pages that only logged in users can see
// usage: <ProtectedRoute><SomePrivatePage /></ProtectedRoute>
function ProtectedRoute({ children }) {
  const { user } = useAuth();

  // no user logged in -> send them to the login page instead
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // user is logged in, show the page they asked for
  return children;
}

export default ProtectedRoute;
