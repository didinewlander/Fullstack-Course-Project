import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as ordersApi from "../api/ordersApi";
import * as deliveriesApi from "../api/deliveriesApi";
import * as invoicesApi from "../api/invoicesApi";

// Orders in Redux (issues #13, #14). Real API calls now - the local mock
// array and the client-side pricing guess are both gone; the server owns
// pricing and returns it on the order.

const toSerialisableError = (error) => ({
  message: error?.message ?? "Could not load orders",
  code: error?.code ?? "UNKNOWN_ERROR",
  status: error?.status ?? 0,
});

/**
 * Attaches each order's delivery and invoice.
 *
 * The displayed lifecycle status (In Transit / Delivered / Billed) is derived
 * from all three records, but /orders/* populates only the user refs. Rather
 * than one request per order, this fetches the caller's deliveries and
 * invoices once each and indexes them by orderId.
 *
 * KNOWN LIMIT: those two lists are paginated independently of the orders
 * list, so on a large account a delivery can fall outside the fetched page
 * and its order reads as merely "Approved". A high limit papers over it; the
 * real fix is for /orders/* to return a delivery+invoice summary server-side.
 */
const attachDeliveriesAndInvoices = async (orders) => {
  const [deliveries, invoices] = await Promise.all([
    deliveriesApi.listDeliveries({ limit: 100 }).catch(() => ({ items: [] })),
    invoicesApi.listMyInvoices({ limit: 100 }).catch(() => ({ items: [] })),
  ]);

  const idOf = (value) =>
    typeof value === "object" && value !== null ? value._id : value;

  const deliveryByOrderId = new Map(
    deliveries.items.map((delivery) => [idOf(delivery.orderId), delivery]),
  );

  const invoiceByOrderId = new Map(
    invoices.items.map((invoice) => [idOf(invoice.orderId), invoice]),
  );

  return orders.map((order) => ({
    ...order,
    delivery: deliveryByOrderId.get(order._id) ?? null,
    invoice: invoiceByOrderId.get(order._id) ?? null,
  }));
};

/** Vendor: orders I placed. Supplier: orders placed with me. */
export const fetchMyOrders = createAsyncThunk(
  "orders/fetchMyOrders",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { items, pagination } = await ordersApi.listMyOrders(params);

      return { items: await attachDeliveriesAndInvoices(items), pagination };
    } catch (error) {
      return rejectWithValue(toSerialisableError(error));
    }
  },
);

/** Manager: every order in the system. */
export const fetchAllOrders = createAsyncThunk(
  "orders/fetchAllOrders",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { items, pagination } = await ordersApi.listAllOrders(params);

      return { items: await attachDeliveriesAndInvoices(items), pagination };
    } catch (error) {
      return rejectWithValue(toSerialisableError(error));
    }
  },
);

export const createOrder = createAsyncThunk(
  "orders/createOrder",
  async (orderInput, { rejectWithValue }) => {
    try {
      return await ordersApi.createOrder(orderInput);
    } catch (error) {
      return rejectWithValue(toSerialisableError(error));
    }
  },
);

export const approveOrder = createAsyncThunk(
  "orders/approveOrder",
  async (orderId, { rejectWithValue }) => {
    try {
      return await ordersApi.approveOrder(orderId);
    } catch (error) {
      return rejectWithValue(toSerialisableError(error));
    }
  },
);

export const cancelOrder = createAsyncThunk(
  "orders/cancelOrder",
  async (orderId, { rejectWithValue }) => {
    try {
      return await ordersApi.cancelOrder(orderId);
    } catch (error) {
      return rejectWithValue(toSerialisableError(error));
    }
  },
);

/**
 * Approve several orders.
 *
 * Deliberately sequential, not Promise.all: POST /orders/:id/approve shares
 * the order rate limiter (1 request / 10s / user), so firing them in parallel
 * would get all but the first rejected with 429. Reports which ones failed
 * instead of failing the batch.
 */
export const approveOrders = createAsyncThunk(
  "orders/approveOrders",
  async (orderIds) => {
    const succeeded = [];
    const failed = [];

    for (const orderId of orderIds) {
      try {
        succeeded.push(await ordersApi.approveOrder(orderId));
      } catch (error) {
        failed.push({ orderId, error: toSerialisableError(error) });
      }
    }

    return { succeeded, failed };
  },
);

// keeps the list in sync after a single-order mutation
const replaceOrder = (state, updatedOrder) => {
  if (!updatedOrder?._id) {
    return;
  }

  const index = state.items.findIndex((item) => item._id === updatedOrder._id);

  if (index !== -1) {
    // preserve the joined delivery/invoice, which the mutation response omits
    state.items[index] = {
      ...state.items[index],
      ...updatedOrder,
    };
  }
};

const ordersSlice = createSlice({
  name: "orders",
  initialState: {
    items: [],
    pagination: null,
    isLoading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    for (const thunk of [fetchMyOrders, fetchAllOrders]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.isLoading = true;
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.isLoading = false;
          state.items = action.payload.items;
          state.pagination = action.payload.pagination;
        })
        .addCase(thunk.rejected, (state, action) => {
          state.isLoading = false;
          state.items = [];
          state.error = action.payload ?? toSerialisableError(action.error);
        });
    }

    builder
      .addCase(approveOrder.fulfilled, (state, action) => {
        replaceOrder(state, action.payload);
      })
      .addCase(cancelOrder.fulfilled, (state, action) => {
        replaceOrder(state, action.payload);
      })
      .addCase(approveOrders.fulfilled, (state, action) => {
        for (const order of action.payload.succeeded) {
          replaceOrder(state, order);
        }
      });
  },
});

export default ordersSlice.reducer;
