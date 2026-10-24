import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export const ProtectedRoute = () => {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/auth" replace />;
  }
  return <Outlet />;
};

export const AuthRoute = ({ children }) => {
  const { token } = useAuth();
  if (token) {
    return <Navigate to="/feed" replace />;
  }
  return children;
};
