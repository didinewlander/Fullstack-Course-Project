import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

const normalizeError = (error) => {
  if (error?.response?.data) {
    return error.response.data;
  }

  return error;
};

export const getOrders = async (params = {}) => {
  try {
    const response = await apiClient.get("/orders", { params });
    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
};

export const getPendingOrders = async () => {
  try {
    const response = await apiClient.get("/orders/pending");
    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
};

export const createOrder = async (orderData) => {
  try {
    const response = await apiClient.post("/orders", orderData);
    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
};

export const approveOrder = async (orderId) => {
  try {
    const response = await apiClient.patch(`/orders/${orderId}/approve`);
    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
};

export const approveBulkOrders = async (orderIds) => {
  try {
    const response = await apiClient.patch("/orders/approve-bulk", {
      orderIds,
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
};

export const cancelOrder = async (orderId) => {
  try {
    const response = await apiClient.patch(`/orders/${orderId}/cancel`);
    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
};

export default {
  getOrders,
  getPendingOrders,
  createOrder,
  approveOrder,
  approveBulkOrders,
  cancelOrder,
};
