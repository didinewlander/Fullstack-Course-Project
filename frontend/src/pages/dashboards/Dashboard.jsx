import { useAuth } from "../../context/useAuth";
import { useNavigate } from "react-router-dom";

// this is just a placeholder page for now
// each role will get its real dashboard later, in a different issue
// (see issues #7, #12, #17, #22, #27 on GitHub)
function Dashboard({ title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1>{title}</h1>
      <p>Welcome, {user?.name}!</p>
      <button type="button" onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}

export default Dashboard;
