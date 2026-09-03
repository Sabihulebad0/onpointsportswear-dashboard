import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { authApi } from "../../api/client";

export const TOKEN_KEY = "sports_admin_token";

const panelRoles = ["admin", "staff", "delivery"];

export const loginUser = createAsyncThunk(
  "auth/login",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const data = await authApi.login(email, password);
      if (!panelRoles.includes(data.user?.role)) {
        throw new Error("This account does not have panel access.");
      }
      localStorage.setItem(TOKEN_KEY, data.token);
      return data;
    } catch (error) {
      return rejectWithValue(error.message || "Login failed");
    }
  }
);

export const registerUser = createAsyncThunk("auth/register", async (payload, { rejectWithValue }) => {
  try {
    const data = await authApi.register({ ...payload, role: "delivery" });
    if (data.user?.role !== "delivery") {
      throw new Error("Delivery account could not be created.");
    }
    localStorage.setItem(TOKEN_KEY, data.token);
    return data;
  } catch (error) {
    return rejectWithValue(error.message || "Could not create account");
  }
});

export const fetchMe = createAsyncThunk("auth/me", async (token, { rejectWithValue }) => {
  try {
    return await authApi.me(token);
  } catch (error) {
    localStorage.removeItem(TOKEN_KEY);
    return rejectWithValue(error.message || "Session expired");
  }
});

export const forgotPassword = createAsyncThunk("auth/forgot", async (email, { rejectWithValue }) => {
  try {
    return await authApi.forgotPassword(email);
  } catch (error) {
    return rejectWithValue(error.message || "Could not send reset");
  }
});

export const resetPassword = createAsyncThunk(
  "auth/reset",
  async ({ token, password }, { rejectWithValue }) => {
    try {
      const data = await authApi.resetPassword(token, password);
      if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
      return data;
    } catch (error) {
      return rejectWithValue(error.message || "Could not reset password");
    }
  }
);

const initialToken = localStorage.getItem(TOKEN_KEY);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    token: initialToken,
    user: null,
    loading: Boolean(initialToken),
    submitting: false,
    error: "",
    message: "",
  },
  reducers: {
    logout(state) {
      localStorage.removeItem(TOKEN_KEY);
      state.token = null;
      state.user = null;
      state.error = "";
      state.message = "";
      state.loading = false;
    },
    clearAuthFeedback(state) {
      state.error = "";
      state.message = "";
    },
  },
  extraReducers: (builder) => {
    const pending = (state) => {
      state.submitting = true;
      state.error = "";
      state.message = "";
    };
    const rejected = (state, action) => {
      state.submitting = false;
      state.loading = false;
      state.error = action.payload || "Request failed";
    };

    builder
      .addCase(loginUser.pending, pending)
      .addCase(loginUser.fulfilled, (state, action) => {
        state.submitting = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(loginUser.rejected, rejected)
      .addCase(registerUser.pending, pending)
      .addCase(registerUser.fulfilled, (state, action) => {
        state.submitting = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(registerUser.rejected, rejected)
      .addCase(fetchMe.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
      })
      .addCase(fetchMe.rejected, (state) => {
        state.loading = false;
        state.token = null;
        state.user = null;
      })
      .addCase(forgotPassword.pending, pending)
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.submitting = false;
        state.message = action.payload.message;
      })
      .addCase(forgotPassword.rejected, rejected)
      .addCase(resetPassword.pending, pending)
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.submitting = false;
        state.message = action.payload.message;
        if (action.payload.token) state.token = action.payload.token;
        if (action.payload.user) state.user = action.payload.user;
      })
      .addCase(resetPassword.rejected, rejected);
  },
});

export const { logout, clearAuthFeedback } = authSlice.actions;
export default authSlice.reducer;
