/*
 * Logs one line per request, written when the response finishes so the
 * status code and duration are known.
 *
 * Example output:
 *   [14:03:21] POST   /api/v1/auth/login            200   84ms
 *   [14:03:22] GET    /api/v1/orders/mine           200   12ms  vendor (Vendor)
 *   [14:03:25] POST   /api/v1/orders                403    3ms  vendor (Vendor)  FORBIDDEN
 *
 * The role is included because most of this API is role-gated, so a 403 is
 * far easier to read when the actor is on the same line.
 */

const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

const METHOD_COLORS = {
  GET: COLORS.cyan,
  POST: COLORS.green,
  PATCH: COLORS.yellow,
  PUT: COLORS.yellow,
  DELETE: COLORS.red,
  OPTIONS: COLORS.dim,
};

const getStatusColor = (/** @type {number} */ statusCode) => {
  if (statusCode >= 500) return COLORS.red;
  if (statusCode >= 400) return COLORS.yellow;
  if (statusCode >= 300) return COLORS.blue;
  return COLORS.green;
};

const paint = (/** @type {string} */ color, /** @type {string} */ text) => {
  return `${color}${text}${COLORS.reset}`;
};

const formatTime = (/** @type {Date} */ date) => {
  return date.toTimeString().slice(0, 8);
};

/*
 * Anything that could carry a credential. Bodies are only logged when
 * LOG_REQUEST_BODY is enabled, and even then these never reach the console.
 */
const REDACTED_FIELDS = [
  "password",
  "currentPassword",
  "newPassword",
  "confirmPassword",
  "token",
  "accessToken",
  "refreshToken",
];

const redactBody = (/** @type {any} */ body) => {
  if (!body || typeof body !== "object") {
    return body;
  }

  const safeBody = Array.isArray(body) ? [...body] : { ...body };

  for (const key of Object.keys(safeBody)) {
    if (REDACTED_FIELDS.includes(key)) {
      safeBody[key] = "[redacted]";
    } else if (safeBody[key] && typeof safeBody[key] === "object") {
      safeBody[key] = redactBody(safeBody[key]);
    }
  }

  return safeBody;
};

const isEnabled = () => {
  return process.env.LOG_REQUESTS !== "false";
};

const shouldLogBody = () => {
  return process.env.LOG_REQUEST_BODY === "true";
};

const requestLogger = (req, res, next) => {
  if (!isEnabled()) {
    return next();
  }

  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    const method = (METHOD_COLORS[req.method] ?? COLORS.reset) + req.method.padEnd(6) + COLORS.reset;

    const status = paint(
      getStatusColor(res.statusCode),
      String(res.statusCode),
    );

    const duration = paint(
      COLORS.dim,
      `${durationMs.toFixed(0)}ms`.padStart(6),
    );

    /*
     * req.auth is attached by the authenticate middleware, which runs
     * inside the routers - by the time the response finishes it is set on
     * any authenticated route.
     */
    const actor = req.auth
      ? paint(COLORS.magenta, ` ${req.auth.username} (${req.auth.role})`)
      : "";

    const parts = [
      paint(COLORS.dim, `[${formatTime(new Date())}]`),
      method,
      req.originalUrl.padEnd(38),
      status,
      duration,
      actor,
    ];

    console.log(parts.join(" "));

    if (shouldLogBody() && req.body && Object.keys(req.body).length > 0) {
      console.log(
        paint(COLORS.dim, `           body: ${JSON.stringify(redactBody(req.body))}`),
      );
    }
  });

  return next();
};

module.exports = requestLogger;
