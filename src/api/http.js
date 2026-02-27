// src/api/http.js
import axios from "axios";

// 1) Base URL
// - Se você usar proxy do Vite (vite.config.js), deixe VITE_API_URL em branco e use caminhos relativos.
// - Se preferir chamar a API diretamente, defina VITE_API_URL="http://localhost:5000/api" no .env.
const baseURL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "/api";
const ACCESS_TOKEN_STORAGE_KEY = "pw_access_token";

function readStoredAccessToken() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
  } catch {
    return null;
  }
}

function writeStoredAccessToken(token) {
  if (typeof window === "undefined") return;
  try {
    if (typeof token === "string" && token.trim().length > 0) {
      window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token.trim());
      return;
    }
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

let inMemoryAccessToken = readStoredAccessToken();

export function setAccessToken(token) {
  const normalizedToken =
    typeof token === "string" && token.trim().length > 0
      ? token.trim()
      : null;
  inMemoryAccessToken = normalizedToken;
  writeStoredAccessToken(normalizedToken);
}

export function clearAccessToken() {
  inMemoryAccessToken = null;
  writeStoredAccessToken(null);
}

export function getAccessToken() {
  return inMemoryAccessToken;
}

const api = axios.create({
  baseURL,
  withCredentials: true,
});

function isPublicAuthRequest(url) {
  const normalized = String(url ?? "").toLowerCase();
  return normalized.includes("/auth/login") || normalized.includes("/auth/register");
}

// 2) Interceptor p/ Authorization: Bearer <token>
api.interceptors.request.use((config) => {
  try {
    config.withCredentials = true;

    if (isPublicAuthRequest(config?.url)) {
      return config;
    }

    const token = getAccessToken();
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
    const skipAuthRedirect = Boolean(error?.config?.skipAuthRedirectOn401);

    if (
      status === 401 &&
      !skipAuthRedirect &&
      !requestUrl.includes("/auth/login") &&
      !requestUrl.includes("/auth/register")
    ) {
      clearAccessToken();
      if (typeof window !== "undefined" && window.location.pathname !== "/") {
        window.location.assign("/");
      }
    }

    return Promise.reject(error);
  }
);

export default api;
