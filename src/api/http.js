// src/api/http.js
import axios from "axios";

// 1) Base URL
// - Se você usar proxy do Vite (vite.config.js), deixe VITE_API_URL em branco e use caminhos relativos.
// - Se preferir chamar a API diretamente, defina VITE_API_URL="http://localhost:5000/api" no .env.
const baseURL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "/api";
const ACCESS_TOKEN_STORAGE_KEY = "pw_access_token";
const REFRESH_TOKEN_STORAGE_KEY = "pw_refresh_token";
const REFRESH_TOKEN_EXPIRES_AT_STORAGE_KEY = "pw_refresh_token_expires_at_utc";
const AUTH_NOTICE_STORAGE_KEY = "pw_auth_notice";

function readStoredAccessToken() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
  } catch {
    return null;
  }
}

function readStorageValue(key) {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(key);
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
  } catch {
    return null;
  }
}

function writeStorageValue(key, value) {
  if (typeof window === "undefined") return;
  try {
    if (typeof value === "string" && value.trim().length > 0) {
      window.localStorage.setItem(key, value.trim());
      return;
    }
    window.localStorage.removeItem(key);
  } catch {
    // ignore storage errors
  }
}

function normalizeToken(rawValue) {
  return typeof rawValue === "string" && rawValue.trim().length > 0
    ? rawValue.trim()
    : null;
}

function normalizeUtcDateString(rawValue) {
  if (!rawValue) return null;
  const parsed = new Date(rawValue);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function isDateInPast(rawValue) {
  if (!rawValue) return false;
  const parsed = new Date(rawValue);
  if (!Number.isFinite(parsed.getTime())) return false;
  return parsed.getTime() <= Date.now();
}

let inMemoryAccessToken = readStoredAccessToken();
let inMemoryRefreshToken = readStorageValue(REFRESH_TOKEN_STORAGE_KEY);
let inMemoryRefreshTokenExpiresAtUtc = readStorageValue(REFRESH_TOKEN_EXPIRES_AT_STORAGE_KEY);
let refreshPromise = null;

export function setAccessToken(token) {
  const normalizedToken = normalizeToken(token);
  inMemoryAccessToken = normalizedToken;
  writeStorageValue(ACCESS_TOKEN_STORAGE_KEY, normalizedToken);
}

export function clearAccessToken() {
  inMemoryAccessToken = null;
  writeStorageValue(ACCESS_TOKEN_STORAGE_KEY, null);
}

export function getAccessToken() {
  return inMemoryAccessToken;
}

export function setRefreshToken(token) {
  const normalizedToken = normalizeToken(token);
  inMemoryRefreshToken = normalizedToken;
  writeStorageValue(REFRESH_TOKEN_STORAGE_KEY, normalizedToken);
}

export function clearRefreshToken() {
  inMemoryRefreshToken = null;
  writeStorageValue(REFRESH_TOKEN_STORAGE_KEY, null);
}

export function getRefreshToken() {
  return inMemoryRefreshToken;
}

export function setRefreshTokenExpiresAtUtc(rawValue) {
  const normalizedDate = normalizeUtcDateString(rawValue);
  inMemoryRefreshTokenExpiresAtUtc = normalizedDate;
  writeStorageValue(REFRESH_TOKEN_EXPIRES_AT_STORAGE_KEY, normalizedDate);
}

export function clearRefreshTokenExpiresAtUtc() {
  inMemoryRefreshTokenExpiresAtUtc = null;
  writeStorageValue(REFRESH_TOKEN_EXPIRES_AT_STORAGE_KEY, null);
}

export function getRefreshTokenExpiresAtUtc() {
  return inMemoryRefreshTokenExpiresAtUtc;
}

export function normalizeAuthTokens(source) {
  if (!source || typeof source !== "object") {
    return {
      accessToken: null,
      refreshToken: null,
      refreshTokenExpiresAtUtc: null,
    };
  }

  return {
    accessToken: normalizeToken(
      source.accessToken ?? source.AccessToken ?? source.token ?? source.Token
    ),
    refreshToken: normalizeToken(
      source.refreshToken ?? source.RefreshToken
    ),
    refreshTokenExpiresAtUtc: normalizeUtcDateString(
      source.refreshTokenExpiresAtUtc ??
        source.RefreshTokenExpiresAtUtc ??
        source.refreshTokenExpiresAt
    ),
  };
}

export function setAuthSession(session) {
  const normalized = normalizeAuthTokens(session);
  setAccessToken(normalized.accessToken);
  setRefreshToken(normalized.refreshToken);
  setRefreshTokenExpiresAtUtc(normalized.refreshTokenExpiresAtUtc);
  clearAuthNotice();
  return normalized;
}

export function clearAuthSession() {
  clearAccessToken();
  clearRefreshToken();
  clearRefreshTokenExpiresAtUtc();
}

export function persistAuthNotice(reason) {
  if (typeof window === "undefined") return;
  try {
    const normalizedReason = normalizeToken(reason);
    if (normalizedReason) {
      window.sessionStorage.setItem(AUTH_NOTICE_STORAGE_KEY, normalizedReason);
      return;
    }
    window.sessionStorage.removeItem(AUTH_NOTICE_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

export function clearAuthNotice() {
  persistAuthNotice(null);
}

export function consumeAuthNotice() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(AUTH_NOTICE_STORAGE_KEY);
    window.sessionStorage.removeItem(AUTH_NOTICE_STORAGE_KEY);
    return normalizeToken(raw);
  } catch {
    return null;
  }
}

const refreshClient = axios.create({
  baseURL,
  withCredentials: true,
});

function isSessionRefreshEligible() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  const expiresAt = getRefreshTokenExpiresAtUtc();
  if (!expiresAt) return true;
  return !isDateInPast(expiresAt);
}

export async function refreshAccessToken() {
  if (!isSessionRefreshEligible()) {
    clearAuthSession();
    throw new Error("Refresh token expirado.");
  }

  if (refreshPromise) return refreshPromise;

  const refreshToken = getRefreshToken();
  refreshPromise = (async () => {
    const response = await refreshClient.post("/auth/refresh", {
      refreshToken,
    });

    const tokens = normalizeAuthTokens(response?.data);
    if (!tokens.accessToken || !tokens.refreshToken) {
      throw new Error("Resposta inválida ao renovar sessão.");
    }

    setAuthSession(tokens);
    return tokens;
  })()
    .catch((error) => {
      clearAuthSession();
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

const api = axios.create({
  baseURL,
  withCredentials: true,
});

function isPublicAuthRequest(url) {
  const normalized = String(url ?? "").toLowerCase();
  return (
    normalized.includes("/auth/login") ||
    normalized.includes("/auth/register") ||
    normalized.includes("/auth/refresh")
  );
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
  async (error) => {
    const status = error?.response?.status;
    const requestConfig = error?.config || {};
    const requestUrl = String(requestConfig?.url ?? "").toLowerCase();
    const skipAuthRedirect = Boolean(requestConfig?.skipAuthRedirectOn401);

    if (
      status === 401 &&
      !skipAuthRedirect &&
      !requestConfig?._retry &&
      !requestConfig?.skipAuthRefreshOn401 &&
      !requestUrl.includes("/auth/login") &&
      !requestUrl.includes("/auth/register") &&
      !requestUrl.includes("/auth/refresh")
    ) {
      try {
        const refreshedTokens = await refreshAccessToken();
        if (refreshedTokens?.accessToken) {
          requestConfig._retry = true;
          requestConfig.headers = requestConfig.headers || {};
          requestConfig.headers.Authorization = `Bearer ${refreshedTokens.accessToken}`;
          return api(requestConfig);
        }
      } catch {
        // refresh falhou: segue fluxo de expiração de sessão
      }
    }

    if (status === 401 && !skipAuthRedirect) {
      clearAuthSession();
      persistAuthNotice("expired");

      if (typeof window !== "undefined") {
        const target = "/?auth=login&session=expired";
        const current = `${window.location.pathname}${window.location.search}`;
        if (current !== target) {
          window.location.assign(target);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
