import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuth } from "./context/AuthContext";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute, AuthRoute } from "./components/layout/RouteGuards";

import { AuthPage } from "./pages/AuthPage";
import { FeedPage } from "./pages/FeedPage";
import { PostDetailsPage } from "./pages/PostDetailsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SettingsPage } from "./pages/SettingsPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { SuggestionsPage } from "./pages/SuggestionsPage";

export default function App() {
  const { token } = useAuth();

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            fontFamily: "Cairo, sans-serif",
            fontSize: "13px",
            fontWeight: "600",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
          },
        }}
      />

      <Routes>
        {/* Auth Route: Only accessible when logged out */}
        <Route
          path="/auth"
          element={
            <AuthRoute>
              <AuthPage />
            </AuthRoute>
          }
        />

        {/* Protected Application Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/feed" replace />} />
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/posts/:postId" element={<PostDetailsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:userId" element={<ProfilePage />} />
            <Route path="/suggestions" element={<SuggestionsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Route>
        </Route>

        {/* Catch-all route */}
        <Route
          path="*"
          element={<Navigate to={token ? "/feed" : "/auth"} replace />}
        />
      </Routes>
    </>
  );
}
