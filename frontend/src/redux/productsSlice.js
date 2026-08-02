import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as productsApi from "../api/productsApi";
import * as inventoryApi from "../api/inventoryApi";

// Products in Redux (issues #8, #9). Now backed by the real
// GET /api/v1/products instead of a local mock array.

const toSerialisableError = (error) => ({
  message: error?.message ?? "Could not load products",
  code: error?.code ?? "UNKNOWN_ERROR",
  status: error?.status ?? 0,
});

/**
 * Loads the public catalog, then the stock for each product.
 *
 * Stock is a separate collection, so it needs a second call per product -
 * there is no joined endpoint. They run concurrently, and a product whose
 * inventory lookup fails (or that has no inventory row yet) simply gets
 * `inventory: null` rather than failing the whole catalog.
 */
export const fetchProducts = createAsyncThunk(
  "products/fetchProducts",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { items, pagination } = await productsApi.listPublicProducts(params);

      const withInventory = await Promise.all(
        items.map(async (product) => {
          try {
            const inventory = await inventoryApi.getInventoryByProduct(
              product._id,
            );

            return { ...product, inventory };
          } catch {
            return { ...product, inventory: null };
          }
        }),
      );

      return { items: withInventory, pagination };
    } catch (error) {
      return rejectWithValue(toSerialisableError(error));
    }
  },
);

const productsSlice = createSlice({
  name: "products",
  initialState: {
    items: [],
    pagination: null,
    searchText: "", // what the vendor typed in the search box
    isLoading: false,
    error: null,
  },
  reducers: {
    setSearchText(state, action) {
      state.searchText = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.items;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.items = [];
        state.error = action.payload ?? toSerialisableError(action.error);
      });
  },
});

export const { setSearchText } = productsSlice.actions;
export default productsSlice.reducer;
