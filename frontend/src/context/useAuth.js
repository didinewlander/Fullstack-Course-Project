import { useContext } from "react";
import { AuthContext } from "./auth-context";

// small helper hook so pages can just do: const { user, login } = useAuth();
export function useAuth() {
  return useContext(AuthContext);
}
