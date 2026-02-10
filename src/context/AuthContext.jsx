import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();
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

function decodeJwtPayload(token) {
  const payloadBase64Url = token.split(".")[1];
  if (!payloadBase64Url) return null;

  const base64 = payloadBase64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const json = atob(padded);
  return JSON.parse(json);
}

function isExpired(decoded) {
  const exp = Number(decoded?.exp ?? 0);
  if (!exp) return false;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return exp <= nowInSeconds;
}

function parseBool(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return false;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => readStoredToken());

useEffect(() => {
  if (!token || typeof token !== "string") {
    setUser(null);
    return;
  }

  try {
    const decoded = decodeJwtPayload(token);
    if (!decoded || isExpired(decoded)) {
      clearStoredTokens();
      setUser(null);
      setToken(null);
      return;
    }

    setUser({
      id: decoded.nameid || decoded.sub || null,
      email: decoded.email || null,
      isAdmin: parseBool(decoded.isAdmin),
      mustChangePassword: parseBool(decoded.mustChangePassword),
    });
  } catch {
    setUser(null);
    setToken(null);
    clearStoredTokens();
  }
}, [token]);


  function login(newToken) {
  clearStoredTokens();
  localStorage.setItem("token", newToken);
  setToken(newToken);

  // ✅ Decodifica e seta user imediatamente (evita race condition com ProtectedRoute)
  try {
    const decoded = decodeJwtPayload(newToken);
    if (!decoded || isExpired(decoded)) {
      throw new Error("Token expirado.");
    }

    setUser({
      id: decoded.nameid || decoded.sub || null,
      email: decoded.email || null,
      isAdmin: parseBool(decoded.isAdmin),
      mustChangePassword: parseBool(decoded.mustChangePassword),
    });
  } catch (err) {
    console.error("Token inválido no login()", err);
    setUser(null);
    setToken(null);
    clearStoredTokens();
    throw err;
  }
}

  function logout() {
    clearStoredTokens();
    setToken(null);
    setUser(null);
  }

  const isAuthenticated = !!user;

return (
  <AuthContext.Provider value={{ user, token, login, setToken: login, logout, isAuthenticated }}>
    {children}
  </AuthContext.Provider>
);

}

export const useAuth = () => useContext(AuthContext);
