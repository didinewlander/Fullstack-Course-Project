import client, {
  unwrap,
  setAccessToken,
  refreshSession,
} from "./client";

// Thin wrappers over /api/v1/auth. Each returns the useful payload, not the
// axios response, so the Redux thunks stay free of transport details.

/**
 * POST /auth/register -> { user, accessToken }
 *
 * Only takes username/email/password. The server always creates a Vendor
 * and deliberately ignores any role in the body, so there is nothing else
 * to send.
 */
export async function register({ username, email, password }) {
  const data = unwrap(
    await client.post("/auth/register", { username, email, password }),
  );

  setAccessToken(data.accessToken);

  return data.user;
}

/** POST /auth/login -> { user, accessToken } */
export async function login({ email, password }) {
  const data = unwrap(await client.post("/auth/login", { email, password }));

  setAccessToken(data.accessToken);

  return data.user;
}

/**
 * Restores a session on page load.
 *
 * There is no access token in memory after a reload, but the httpOnly
 * refresh cookie survives it - and /auth/refresh returns the user along
 * with the new access token, so this one call is the whole bootstrap. No
 * separate /auth/me needed.
 */
export async function restoreSession() {
  const { user } = await refreshSession();

  return user;
}

/** GET /auth/me -> the current user. For revalidating an active session. */
export async function getCurrentUser() {
  return unwrap(await client.get("/auth/me"));
}

/**
 * POST /auth/logout - revokes this session's refresh token and clears the
 * cookie. Always drop the in-memory token, even if the call fails, so the
 * client is logged out regardless.
 */
export async function logout() {
  try {
    await client.post("/auth/logout");
  } catch {
    /*
     * Deliberately swallowed. A `finally` alone still re-threw, which
     * rejected the logoutUser thunk - and that thunk only handles
     * `fulfilled`, so the user was never cleared from the store and the
     * login page bounced them straight back into the dashboard. In other
     * words a failed logout request meant you could not log out at all.
     *
     * This is not unlikely either: if the access token has already expired
     * and the refresh fails, this very call is the one that 401s.
     *
     * There is nothing the user could do with the error anyway - the local
     * session is gone either way, and the refresh token expires on its own.
     */
  } finally {
    setAccessToken(null);
  }
}

/** POST /auth/logout-all - revokes every session for this user. */
export async function logoutEverywhere() {
  try {
    await client.post("/auth/logout-all");
  } finally {
    setAccessToken(null);
  }
}
