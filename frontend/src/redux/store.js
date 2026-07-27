import { configureStore } from "@reduxjs/toolkit";
import productsReducer from "./productsSlice";
import ordersReducer from "./ordersSlice";

// this is the main Redux store for the whole app
// products (issue #8) and orders (issue #11/#12) live here
// more slices (notifications, etc.) will be added here later
const store = configureStore({
  reducer: {
    products: productsReducer,
    orders: ordersReducer,
  },
});

export default store;
