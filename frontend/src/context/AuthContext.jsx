import { useState } from "react";
import { AuthContext } from "./auth-context";

// this key is used to save the user in localStorage
// this way the user stays logged in even after refreshing the page
const STORAGE_KEY = "doHookIn_user";

export function AuthProvider({ children }) {
  // try to read a saved user from localStorage when the app first loads
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  // FAKE login for now, just to make the forms work end to end
  // we don't check the password here, we are not using Redux yet either (issue #3)
  // TODO: replace with real API call once backend Auth (issue #5) is ready
  function login({ email }) {
    // in a real app the server would check the password and return the user
    const fakeUser = {
      email,
      name: email.split("@")[0],
      role: "vendor", // default role until we get the real one from the server
    };

    setUser(fakeUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fakeUser));
    return fakeUser;
  }

  // FAKE register, same idea as login
  // TODO: replace with real API call once backend Auth (issue #5) is ready
  function register({ name, email, role }) {
    const newUser = { name, email, role };

    setUser(newUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    return newUser;
  }

  function logout() {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  const value = { user, login, register, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
