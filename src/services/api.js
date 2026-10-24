import { API_BASE_URL, BASE_URL_STORAGE_KEY, TOKEN_STORAGE_KEY } from "../config/constants";

export const getStoredBaseUrl = () => {
  const stored = localStorage.getItem(BASE_URL_STORAGE_KEY);
  if (!stored) return API_BASE_URL;
  if (/localhost:3010\/?$/.test(stored.replace(/^https?:\/\//, ""))) {
    localStorage.setItem(BASE_URL_STORAGE_KEY, API_BASE_URL);
    return API_BASE_URL;
  }
  return stored;
};

export const getStoredToken = () => {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || "";
};

export const cleanParams = (params) => {
  if (!params) return {};
  const cleaned = { ...params };
  Object.keys(cleaned).forEach((key) => {
    const val = cleaned[key];
    if (val === "" || val === undefined || val === null) {
      delete cleaned[key];
    }
  });
  return cleaned;
};

export const createApiClient = ({ getBaseUrl, getToken }) => {
  const request = async ({
    path,
    method = "GET",
    auth = true,
    body,
    form,
    query,
  }) => {
    const base = (getBaseUrl ? getBaseUrl() : getStoredBaseUrl()).replace(/\/$/, "");
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${base}${cleanPath}`);

    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v).trim() !== "") {
          url.searchParams.set(k, String(v));
        }
      });
    }

    const headers = {
      Accept: "application/json",
    };

    if (auth) {
      const token = getToken ? getToken() : getStoredToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
        headers.token = token;
      }
    }

    let payload;
    if (form) {
      payload = form;
    } else if (body) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }

    let response;
    try {
      response = await fetch(url.toString(), {
        method,
        headers,
        body: payload,
      });
    } catch {
      throw new Error(`Unable to connect to API at ${base}. Please check backend availability.`);
    }

    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(response.ok ? "Invalid response format from server" : `Request failed (${response.status})`);
      }
    }

    if (!response.ok) {
      const errorMsg = data?.message || data?.error || data?.errors || `Request failed (${response.status})`;
      throw new Error(typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg));
    }

    if (!data) {
      throw new Error("Empty response body");
    }

    return data;
  };

  return { request };
};
