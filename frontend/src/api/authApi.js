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
