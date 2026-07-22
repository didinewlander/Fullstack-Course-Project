import { createSlice } from "@reduxjs/toolkit";
import mockProducts from "../data/mockProducts";

// this is the Redux slice for products (issue #8)
// for now we just load the mock/fake products straight into the state
// TODO: once issue #10 (backend) + #9 (axios) are ready, fetch real products
// here instead (probably with createAsyncThunk)
const productsSlice = createSlice({
  name: "products",
  initialState: {
    items: mockProducts,
    searchText: "", // what the vendor typed in the search box
  },
  reducers: {
    setSearchText(state, action) {
      state.searchText = action.payload;
    },
  },
});

export const { setSearchText } = productsSlice.actions;
export default productsSlice.reducer;
