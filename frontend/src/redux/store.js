import { configureStore } from "@reduxjs/toolkit";
import productsReducer from "./productsSlice";

// this is the main Redux store for the whole app
// right now it only has the products slice (issue #8)
// more slices (orders, notifications, etc.) will be added here later
const store = configureStore({
  reducer: {
    products: productsReducer,
  },
});

export default store;
