import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import ordersService from '../../services/orders.service';

// Async Thunks
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (_, { rejectWithValue }) => {
    try {
      return await ordersService.getOrders();
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchPendingOrders = createAsyncThunk(
  'orders/fetchPendingOrders',
  async (_, { rejectWithValue }) => {
    try {
      return await ordersService.getPendingOrders();
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const createOrder = createAsyncThunk(
  'orders/createOrder',
  async (orderData, { rejectWithValue }) => {
    try {
      return await ordersService.createOrder(orderData);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const approveOrder = createAsyncThunk(
  'orders/approveOrder',
  async (orderId, { rejectWithValue }) => {
    try {
      return await ordersService.approveOrder(orderId);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const approveBulkOrders = createAsyncThunk(
  'orders/approveBulkOrders',
  async (orderIds, { rejectWithValue }) => {
    try {
      return await ordersService.approveBulkOrders(orderIds);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const cancelOrder = createAsyncThunk(
  'orders/cancelOrder',
  async (orderId, { rejectWithValue }) => {
    try {
      return await ordersService.cancelOrder(orderId);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

const initialState = {
  orders: [],
  pendingOrders: [],
  loading: false,
  error: null,
};

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetchOrders
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchPendingOrders
      .addCase(fetchPendingOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPendingOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.pendingOrders = action.payload;
      })
      .addCase(fetchPendingOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // createOrder
      .addCase(createOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.orders.push(action.payload);
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // approveOrder
      .addCase(approveOrder.fulfilled, (state, action) => {
        const updatedOrder = action.payload;
        state.orders = state.orders.map((o) => (o._id === updatedOrder._id ? updatedOrder : o));
        state.pendingOrders = state.pendingOrders.filter((o) => o._id !== updatedOrder._id);
      })
      // approveBulkOrders
      .addCase(approveBulkOrders.fulfilled, (state, action) => {
        const approvedIds = action.payload.ids || [];
        state.pendingOrders = state.pendingOrders.filter((o) => !approvedIds.includes(o._id));
      })
      // cancelOrder
      .addCase(cancelOrder.fulfilled, (state, action) => {
        const cancelledOrder = action.payload;
        state.orders = state.orders.map((o) => (o._id === cancelledOrder._id ? cancelledOrder : o));
      });
  },
});

export default ordersSlice.reducer;
