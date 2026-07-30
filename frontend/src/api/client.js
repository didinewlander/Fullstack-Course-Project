import axios from "axios";

// Must include the /api/v1 prefix. It matters beyond routing: the refresh
// cookie the server sets is scoped to path "/api/v1/auth", so if the base
// URL is wrong the browser silently never sends the cookie and every
// refresh fails with no obvious cause.
const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";

/*
 * The access token is held in memory only, never in localStorage.
 *
 * It is short lived (ACCESS_TOKEN_MINUTES, 15 by default) and the long
 * lived refresh token already lives in an httpOnly cookie the browser
 * sends automatically - so on a page reload we ask /auth/refresh for a new
 * access token rather than keeping one somewhere a XSS bug could read.
 */
let accessToken = null;

export function setAccessToken(token) {
  accessToken = token ?? null;
}

export function getAccessToken() {
  return accessToken;
}

/*
 * Called when the session is gone for good (refresh itself failed), so the
 * auth slice can clear the user. Registered from main.jsx rather than
 * imported, to keep this module free of any Redux dependency.
 */
let sessionExpiredHandler = () => {};

export function setSessionExpiredHandler(handler) {
  sessionExpiredHandler = handler;
}

export class ApiError extends Error {
  constructor({ message, code, status, details }) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// Every failure the server produces looks like
// { success: false, error: { code, message, details? } }
// (see backend/middleware/errorHandler.js). Collapse that - plus network
// failures, which have no response at all - into one shape callers can rely
// on, so no component ever pokes at error.response.data.error itself.
function normalizeError(error) {
  const payload = error.response?.data?.error;

  if (payload) {
    return new ApiError({
      message: payload.message ?? "Request failed",
      code: payload.code ?? "UNKNOWN_ERROR",
      status: error.response.status,
      details: payload.details,
    });
  }

  if (error.response) {
    return new ApiError({
      message: error.response.statusText || "Request failed",
      code: "UNEXPECTED_RESPONSE",
      status: error.response.status,
    });
  }

  return new ApiError({
    message:
      "Could not reach the server. Check that the API is running and that " +
      "VITE_API_URL points at it.",
    code: "NETWORK_ERROR",
    status: 0,
  });
}

const client = axios.create({
  baseURL,

  // sends and accepts the httpOnly refresh cookie. Required, not optional -
  // the server also has to allow it (cors credentials:true in server.js).
  withCredentials: true,
});

client.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

/*
 * A separate bare instance for the refresh call itself. Using `client`
 * would put the refresh request through the response interceptor below,
 * so a failing refresh would try to refresh itself, forever.
 */
const refreshClient = axios.create({ baseURL, withCredentials: true });

/*
 * In-flight refresh, shared by every caller.
 *
 * This single-flight guard is essential, not an optimisation. The server
 * ROTATES the refresh token on every use and treats a second use of an
 * already-rotated token as theft: it revokes every session the user has
 * (REFRESH_TOKEN_REUSED in backend/services/auth.service.js). So if three
 * requests 401 at once and each fired its own refresh, two would present a
 * spent token and the user would be logged out of everything.
 */
let refreshPromise = null;

export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post("/auth/refresh")
      .then((response) => {
        const { user, accessToken: newAccessToken } = response.data.data;

        setAccessToken(newAccessToken);

        return { user, accessToken: newAccessToken };
      })
      .catch((error) => {
        setAccessToken(null);
        throw normalizeError(error);
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

// A 401 from these means "those credentials are wrong" or "there is no
// session", never "your access token aged out" - so refreshing and retrying
// would be pointless and would mask the real error from the login form.
const NO_RETRY_PATHS = ["/auth/login", "/auth/register", "/auth/refresh"];

function isRetryable(config) {
  if (!config || config._isRetry) {
    return false;
  }

  const url = config.url ?? "";

  return !NO_RETRY_PATHS.some((path) => url.startsWith(path));
}

client.interceptors.response.use(
  (response) => response,

  async (error) => {
    const { config, response } = error;

    if (response?.status === 401 && isRetryable(config)) {
      try {
        await refreshSession();
      } catch {
        // the refresh token is gone or was rejected: really logged out
        sessionExpiredHandler();

        return Promise.reject(normalizeError(error));
      }

      // replay the original request once, now with a fresh token
      return client({ ...config, _isRetry: true });
    }

    return Promise.reject(normalizeError(error));
  },
);

/*
 * Unwraps the { success, data } envelope. Kept as an explicit helper
 * instead of a response interceptor so responses that also carry
 * `pagination` alongside `data` do not lose it.
 */
export function unwrap(response) {
  return response.data?.data;
}

/*
 * List endpoints answer with { success, data: [...], pagination } - keep
 * both, since callers need the page metadata to paginate.
 */
export function unwrapList(response) {
  return {
    items: response.data?.data ?? [],
    pagination: response.data?.pagination ?? null,
  };
}

// Absolute URL for a file the API serves out of /uploads (product images,
// invoice PDFs). The stored value is a relative path like
// "uploads/products/x.png", and /uploads is mounted at the server root -
// outside /api/v1 - so the version prefix has to come off.
export function fileUrl(storedPath) {
  if (!storedPath) {
    return null;
  }

  if (/^https?:\/\//i.test(storedPath)) {
    return storedPath;
  }

  const serverRoot = baseURL.replace(/\/api\/v\d+\/?$/, "");

  return `${serverRoot}/${String(storedPath).replace(/^\/+/, "")}`;
}

export default client;
