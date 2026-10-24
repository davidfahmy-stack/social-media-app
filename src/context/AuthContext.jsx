import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { BASE_URL_STORAGE_KEY, TOKEN_STORAGE_KEY } from "../config/constants";
import { createApiClient, getStoredBaseUrl, cleanParams } from "../services/api";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children, queryClient }) => {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY) || "");
  const [baseUrl, setBaseUrlState] = useState(getStoredBaseUrl);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const apiClient = useMemo(() => {
    return createApiClient({
      getBaseUrl: () => baseUrl,
      getToken: () => token,
    });
  }, [baseUrl, token]);

  const setBaseUrl = useCallback((newUrl) => {
    setBaseUrlState(newUrl);
    localStorage.setItem(BASE_URL_STORAGE_KEY, newUrl);
  }, []);

  const clearError = useCallback(() => setError(""), []);

  const refreshMe = useCallback(async () => {
    if (!token) {
      setMe(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.request({ path: "/users/profile-data" });
      setMe(res.data?.user || res.user || null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to refresh profile";
      setError(msg);
      if (msg.toLowerCase().includes("token") || msg.toLowerCase().includes("jwt") || msg.toLowerCase().includes("unauthorized")) {
        setToken("");
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setMe(null);
      }
    } finally {
      setLoading(false);
    }
  }, [apiClient, token]);

  const signIn = useCallback(
    async (credentials) => {
      setLoading(true);
      setError("");
      try {
        const res = await apiClient.request({
          path: "/users/signin",
          method: "POST",
          auth: false,
          body: cleanParams(credentials),
        });
        const receivedToken = res.data?.token || res.token;
        const receivedUser = res.data?.user || res.user;
        if (receivedToken) {
          setToken(receivedToken);
          localStorage.setItem(TOKEN_STORAGE_KEY, receivedToken);
        }
        if (receivedUser) {
          setMe(receivedUser);
        }
        return res;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Sign in failed";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiClient]
  );

  const signUp = useCallback(
    async (userData) => {
      setLoading(true);
      setError("");
      try {
        const res = await apiClient.request({
          path: "/users/signup",
          method: "POST",
          auth: false,
          body: cleanParams(userData),
        });
        const receivedToken = res.data?.token || res.token;
        const receivedUser = res.data?.user || res.user;
        if (receivedToken) {
          setToken(receivedToken);
          localStorage.setItem(TOKEN_STORAGE_KEY, receivedToken);
        }
        if (receivedUser) {
          setMe(receivedUser);
        }
        return res;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Sign up failed";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiClient]
  );

  const changePassword = useCallback(
    async ({ password, newPassword }) => {
      setLoading(true);
      setError("");
      try {
        const res = await apiClient.request({
          path: "/users/change-password",
          method: "PATCH",
          body: cleanParams({ password, newPassword }),
        });
        const receivedToken = res.data?.token || res.token;
        if (receivedToken) {
          setToken(receivedToken);
          localStorage.setItem(TOKEN_STORAGE_KEY, receivedToken);
        }
        return res;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Change password failed";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiClient]
  );

  const uploadPhoto = useCallback(
    async (file, privacy = "public") => {
      setLoading(true);
      setError("");
      try {
        const formData = new FormData();
        formData.set("photo", file);
        formData.set("privacy", privacy);
        const res = await apiClient.request({
          path: "/users/upload-photo",
          method: "PUT",
          form: formData,
        });
        await refreshMe();
        return res;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload photo failed";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiClient, refreshMe]
  );

  const uploadCover = useCallback(
    async (file, privacy = "public") => {
      setLoading(true);
      setError("");
      try {
        const formData = new FormData();
        formData.set("cover", file);
        formData.set("privacy", privacy);
        const res = await apiClient.request({
          path: "/users/upload-cover",
          method: "PUT",
          form: formData,
        });
        await refreshMe();
        return res;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload cover failed";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiClient, refreshMe]
  );

  const deleteCover = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.request({
        path: "/users/cover",
        method: "DELETE",
      });
      await refreshMe();
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete cover failed";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiClient, refreshMe]);

  const logout = useCallback(() => {
    setToken("");
    setMe(null);
    setError("");
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    if (queryClient) {
      queryClient.clear();
    }
  }, [queryClient]);

  // Initial load of profile data if token is present
  useEffect(() => {
    if (token) {
      refreshMe();
    }
  }, [token, refreshMe]);

  const value = useMemo(
    () => ({
      token,
      baseUrl,
      me,
      loading,
      error,
      setBaseUrl,
      clearError,
      signIn,
      signUp,
      changePassword,
      refreshMe,
      uploadPhoto,
      uploadCover,
      deleteCover,
      logout,
      request: apiClient.request,
    }),
    [
      token,
      baseUrl,
      me,
      loading,
      error,
      setBaseUrl,
      clearError,
      signIn,
      signUp,
      changePassword,
      refreshMe,
      uploadPhoto,
      uploadCover,
      deleteCover,
      logout,
      apiClient.request,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
