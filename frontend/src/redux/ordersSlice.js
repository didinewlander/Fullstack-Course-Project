import { createSlice } from "@reduxjs/toolkit";
import mockOrders from "../data/mockOrders";

// this is the Redux slice for orders (issue #11/#12)
// orders live only in Redux state for now, seeded from mock data
// TODO: once issue #15 (backend) + axios are ready, replace these sync
// reducers with createAsyncThunk calls (create/cancel/approve become real
// POST/PATCH requests instead of local state mutations)
const ordersSlice = createSlice({
  name: "orders",
  initialState: {
    items: mockOrders,
  },
  reducers: {
    createOrder: {
      reducer(state, action) {
        state.items.push(action.payload);
      },
      prepare({ vendorEmail, vendorName, items, pickupDate }) {
        return {
          payload: {
            id: Date.now(), // TODO: real backend-issued id once issue #15 lands
            vendorEmail,
            vendorName,
            items,
            pickupDate,
            status: "Pending",
            createdAt: new Date().toISOString(),
          },
        };
      },
    },
    cancelOrder(state, action) {
      const order = state.items.find((o) => o.id === action.payload);
      if (order) order.status = "Cancelled";
    },
    approveOrder(state, action) {
      const order = state.items.find((o) => o.id === action.payload);
      if (order && order.status === "Pending") order.status = "Approved";
    },
    approveOrders(state, action) {
      // action.payload: array of order ids to bulk-approve
      state.items.forEach((order) => {
        if (action.payload.includes(order.id) && order.status === "Pending") {
          order.status = "Approved";
        }
      });
    },
  },
});

export const { createOrder, cancelOrder, approveOrder, approveOrders } =
  ordersSlice.actions;
export default ordersSlice.reducer;
