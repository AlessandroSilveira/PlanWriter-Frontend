// src/api/http.js
import axios from "axios";

// 1) Base URL
// - Se você usar proxy do Vite (vite.config.js), deixe VITE_API_URL em branco e use caminhos relativos.
// - Se preferir chamar a API diretamente, defina VITE_API_URL="http://localhost:5000/api" no .env.
const baseURL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "/api";
const TOKEN_KEYS = ["token", "accessToken", "jwt"];

function readStoredToken() {
  try {
    for (const key of TOKEN_KEYS) {
      const value = localStorage.getItem(key);
      if (typeof value === "string" && value.trim().length > 0) {
        return value;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function clearStoredTokens() {
  try {
    TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore
  }
}

const api = axios.create({
  baseURL,
  withCredentials: false,
});

function isPublicAuthRequest(url) {
  const normalized = String(url ?? "").toLowerCase();
  return normalized.includes("/auth/login") || normalized.includes("/auth/register");
}

// 2) Interceptor p/ Authorization: Bearer <token>
api.interceptors.request.use((config) => {
  try {
    if (isPublicAuthRequest(config?.url)) {
      return config;
    }

    const token = readStoredToken();

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl = String(error?.config?.url ?? "");

    if (
      status === 401 &&
      !requestUrl.includes("/auth/login") &&
      !requestUrl.includes("/auth/register")
    ) {
      clearStoredTokens();
      if (typeof window !== "undefined" && window.location.pathname !== "/") {
        window.location.assign("/");
      }
    }

    return Promise.reject(error);
  }
);

export default api;
