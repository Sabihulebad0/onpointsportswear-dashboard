import { useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  clearAuthFeedback,
  fetchMe,
  forgotPassword as forgotPasswordThunk,
  loginUser,
  logout as logoutAction,
  registerUser,
  resetPassword as resetPasswordThunk,
} from "../features/auth/authSlice";

export function AuthSession() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);

  useEffect(() => {
    if (token && !user) dispatch(fetchMe(token));
  }, [dispatch, token, user]);

  return null;
}

export function useAuth() {
  const dispatch = useDispatch();
  const { token, user, loading, submitting, error, message } = useSelector((state) => state.auth);

  const login = useCallback(
    (email, password) => dispatch(loginUser({ email, password })).unwrap(),
    [dispatch]
  );
  const register = useCallback((payload) => dispatch(registerUser(payload)).unwrap(), [dispatch]);
  const forgotPassword = useCallback((email) => dispatch(forgotPasswordThunk(email)).unwrap(), [dispatch]);
  const resetPassword = useCallback(
    (resetToken, password) => dispatch(resetPasswordThunk({ token: resetToken, password })).unwrap(),
    [dispatch]
  );
  const logout = useCallback(() => dispatch(logoutAction()), [dispatch]);
  const clearFeedback = useCallback(() => dispatch(clearAuthFeedback()), [dispatch]);

  return useMemo(() => {
    const isAdmin = user?.role === "admin";
    const isDelivery = user?.role === "delivery";
    const permissions = user?.permissions || [];
    const hasPermission = (permission) =>
      isAdmin || permissions.includes("*") || permissions.includes(permission);

    return {
      token,
      user,
      loading,
      submitting,
      error,
      message,
      isAdmin,
      isDelivery,
      canAccessAdmin: isAdmin || user?.role === "staff" || isDelivery,
      hasPermission,
      login,
      register,
      forgotPassword,
      resetPassword,
      logout,
      clearFeedback,
    };
  }, [
    token,
    user,
    loading,
    submitting,
    error,
    message,
    login,
    register,
    forgotPassword,
    resetPassword,
    logout,
    clearFeedback,
  ]);
}
