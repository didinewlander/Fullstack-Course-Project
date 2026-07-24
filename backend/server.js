const express = require("express");
const dotenv = require("dotenv");
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
const { notifyDeliveriesArrivingSoon } = require("./services/delivery.service");
const errorHandler = require("./middleware/errorHandler");
const AppError = require("./utils/AppError");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

initDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));

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
