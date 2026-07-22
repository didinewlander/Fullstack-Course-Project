import { createContext } from "react";

// just the context object itself, kept in its own file
// (eslint wants component files to only export components, so the
// context and the hook live here and in useAuth.js instead)
export const AuthContext = createContext(null);
