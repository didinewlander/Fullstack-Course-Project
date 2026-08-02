import { useDispatch, useSelector } from "react-redux";
import {
  loginUser,
  registerUser,
  logoutUser,
  clearAuthError,
} from "../redux/authSlice";

// small helper hook so pages can just do: const { user, login } = useAuth();
//
// Auth now lives in Redux (issue #3) instead of the fake localStorage
// context, but this hook deliberately kept its shape: every page that
// already did `const { user, logout } = useAuth()` still works untouched.
//
// login/register return a promise that RESOLVES with the user or REJECTS
// with the normalized API error, so the forms can await them and show a
// real server message. .unwrap() is what turns a rejected thunk into a throw.
export function useAuth() {
  const dispatch = useDispatch();

  const { user, isBootstrapped, status, error } = useSelector(
    (state) => state.auth,
  );

  return {
    user,
    isBootstrapped,
    isSubmitting: status === "loading",
    error,

    login: (credentials) => dispatch(loginUser(credentials)).unwrap(),
    register: (credentials) => dispatch(registerUser(credentials)).unwrap(),
    logout: () => dispatch(logoutUser()),
    clearError: () => dispatch(clearAuthError()),
  };
}
