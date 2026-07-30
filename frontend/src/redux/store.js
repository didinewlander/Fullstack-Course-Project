import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import productsReducer from "./productsSlice";
import ordersReducer from "./ordersSlice";

// this is the main Redux store for the whole app
// auth (issue #3), products (issue #8) and orders (issue #11/#12) live here
// more slices (notifications, etc.) will be added here later
const store = configureStore({
  reducer: {
    auth: authReducer,
    products: productsReducer,
    orders: ordersReducer,
  },
});

export default store;
