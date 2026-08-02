import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as authApi from "../api/authApi";

// Auth state in Redux (issue #3), replacing the fake localStorage
// AuthContext. The session user is no longer persisted by us at all - the
// httpOnly refresh cookie is the source of truth, and `bootstrapSession`
// below trades it for a user + access token on every page load.

const initialState = {
  user: null,

  // false until the initial refresh attempt has settled. Route guards must
  // wait for this, otherwise a reload flashes the login page for a moment
  // before the session comes back.
  isBootstrapped: false,

  // "idle" | "loading" - covers login/register submissions
  status: "idle",

  error: null,
};

// Rejections carry the normalized ApiError from the axios layer. Only the
// serialisable parts go into the store.
const toSerialisableError = (error) => ({
  message: error?.message ?? "Something went wrong",
  code: error?.code ?? "UNKNOWN_ERROR",
  status: error?.status ?? 0,
});

export const bootstrapSession = createAsyncThunk(
  "auth/bootstrapSession",
  async (_, { rejectWithValue }) => {
    try {
      return await authApi.restoreSession();
    } catch (error) {
      // No session is the normal case for a first-time visitor, so this is
      // not surfaced as an error anywhere in the UI.
      return rejectWithValue(toSerialisableError(error));
    }
  },
);

export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (credentials, { rejectWithValue }) => {
    try {
      return await authApi.login(credentials);
    } catch (error) {
      return rejectWithValue(toSerialisableError(error));
    }
  },
);

export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async (credentials, { rejectWithValue }) => {
    try {
      return await authApi.register(credentials);
    } catch (error) {
      return rejectWithValue(toSerialisableError(error));
    }
  },
);

export const logoutUser = createAsyncThunk("auth/logoutUser", async () => {
  // authApi.logout clears the in-memory token even if the request fails,
  // so there is no failure case worth reporting here.
  await authApi.logout();
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Called by the axios layer when a refresh fails mid-session, i.e. the
    // session expired while the app was open. See setSessionExpiredHandler.
    sessionExpired(state) {
      state.user = null;
      state.status = "idle";
      state.error = null;
    },

    clearAuthError(state) {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(bootstrapSession.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isBootstrapped = true;
      })
      .addCase(bootstrapSession.rejected, (state) => {
        state.user = null;
        state.isBootstrapped = true;
      });

    // login and register behave identically from the store's point of view
    for (const thunk of [loginUser, registerUser]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.status = "loading";
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.status = "idle";
          state.user = action.payload;
          state.error = null;
          state.isBootstrapped = true;
        })
        .addCase(thunk.rejected, (state, action) => {
          state.status = "idle";
          state.user = null;
          state.error = action.payload ?? toSerialisableError(action.error);
        });
    }

    /*
     * Both outcomes clear the session. authApi.logout no longer throws, but
     * handling `rejected` too means a future change there cannot strand a
     * user in a logged-in store with no way out.
     */
    for (const outcome of [logoutUser.fulfilled, logoutUser.rejected]) {
      builder.addCase(outcome, (state) => {
        state.user = null;
        state.status = "idle";
        state.error = null;
      });
    }
  },
});

export const { sessionExpired, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
