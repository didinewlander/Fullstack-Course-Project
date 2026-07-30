const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");

const initDB = require("./config/mongoDB");
const cookieParser = require("cookie-parser");
const userRouter = require("./routes/userRoute");
const authRouter = require("./routes/authRoute");
const productRouter = require("./routes/productRoute");
const orderRoutes = require("./routes/orderRoute");
const notificationRoutes = require("./routes/notificationRoute");
const notificationRuleRoutes = require("./routes/notificationRuleRoute");
const invoiceRoutes = require("./routes/invoiceRoute");
const inventoryRoutes = require("./routes/inventoryRoute");
const deliveryRoutes = require("./routes/deliveryRoute");
const reportRoutes = require("./routes/reportRoute");
const searchRoutes = require("./routes/searchRoute");
const { notifyDeliveriesArrivingSoon } = require("./services/delivery.service");
const errorHandler = require("./middleware/errorHandler");
const requestLogger = require("./middleware/requestLogger");
const AppError = require("./utils/AppError");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

initDB();

/*
 * req.ip is recorded on every auth session, and the order rate limiter
 * keys on it. Behind a proxy (or in production) Express must be told to
 * trust X-Forwarded-For, otherwise every request looks like it comes
 * from the same address.
 */
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

/*
 * First in the chain on purpose, so it sees genuinely every request -
 * including CORS preflights (which the cors middleware answers and ends
 * itself) and requests rejected for coming from a disallowed origin.
 */
app.use(requestLogger);

/*
 * crossOriginResourcePolicy is relaxed because the SPA runs on a
 * different origin than the API and still has to load the files served
 * from /uploads (product images, invoice PDFs). Helmet's default of
 * "same-origin" would block them.
 */
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  }),
);

/*
 * credentials:true is required, not optional. The refresh token is sent
 * as an httpOnly cookie, so without it the browser would drop the cookie
 * on every /api/v1/auth/refresh call.
 *
 * Because credentials are enabled, the origin cannot be "*" - it has to
 * be the explicit client origin.
 */
const allowedOrigins = (process.env.CLIENT_URL ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, response) {
      /*
       * A missing Origin header means the request did not come from a
       * browser page (curl, Postman, server-to-server), so there is
       * nothing to block.
       */
      if (!origin || allowedOrigins.includes(origin)) {
        return response(null, true);
      }

      return response(
        new AppError(
          `Origin ${origin} is not allowed by CORS`,
          403,
          "ORIGIN_NOT_ALLOWED",
        ),
      );
    },

    credentials: true,

    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],

    /*
     * Lets the frontend read the rate limit headers that
     * express-rate-limit sets on POST /api/v1/orders.
     */
    exposedHeaders: ["RateLimit", "RateLimit-Policy", "Retry-After"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/v1/users", userRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/notification-rules", notificationRuleRoutes);
app.use("/api/v1/invoices", invoiceRoutes);
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/deliveries", deliveryRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/search", searchRoutes);

app.use((req, res, next) => {
  next(
    new AppError(
      `Route ${req.method} ${req.originalUrl} was not found`,
      404,
      "ROUTE_NOT_FOUND",
    ),
  );
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

  notifyDeliveriesArrivingSoon().catch((error) => {
    console.error("Failed to check upcoming deliveries:", error.message);
  });

  setInterval(
    () => {
      notifyDeliveriesArrivingSoon().catch((error) => {
        console.error("Failed to check upcoming deliveries:", error.message);
      });
    },
    15 * 60 * 1000,
  );
});
