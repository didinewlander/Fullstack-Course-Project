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
const errorHandler = require("./middleware/errorHandler");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

initDB();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// @ts-ignore
app.use("/api/users", userRouter);
app.use("/api/products", productRouter);
app.use("/api/auth", authRouter);
app.use("/api/orders", orderRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/notification-rules", notificationRuleRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/deliveries", deliveryRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
