import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, { clearAccessToken, setAccessToken } from "../api/http";

const AuthContext = createContext();

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

function mapUserFromClaims(source) {
  if (!source || typeof source !== "object") {
    return null;
  }

  return {
    id: source.nameid ?? source.sub ?? source.id ?? source.userId ?? null,
    email: source.email ?? source.Email ?? null,
    isAdmin: parseBool(source.isAdmin ?? source.IsAdmin ?? source.is_admin),
    mustChangePassword: parseBool(
      source.mustChangePassword ??
        source.MustChangePassword ??
        source.must_change_password
    ),
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    let alive = true;

    const bootstrapSession = async () => {
      try {
        // Bootstrap via cookie-backed session when available.
        const { data } = await api.get("/profile/me", {
          skipAuthRedirectOn401: true,
        });

        if (!alive) return;

        const sessionUser = mapUserFromClaims(data);
        if (sessionUser?.email) {
          setUser(sessionUser);
        }
      } catch {
        if (!alive) return;
        setUser(null);
        setToken(null);
        clearAccessToken();
      } finally {
        if (alive) {
          setIsBootstrapping(false);
        }
      }
    };

    bootstrapSession();

    return () => {
      alive = false;
    };
  }, []);

  function login(newToken) {
    if (typeof newToken !== "string" || newToken.trim().length === 0) {
      throw new Error("Token inválido recebido do servidor.");
    }

    const normalizedToken = newToken.trim();

    try {
      const decoded = decodeJwtPayload(normalizedToken);
      if (!decoded || isExpired(decoded)) {
        throw new Error("Token expirado.");
      }

      const mapped = mapUserFromClaims(decoded);

      setAccessToken(normalizedToken);
      setToken(normalizedToken);
      setUser(mapped);
      setIsBootstrapping(false);

      return mapped;
    } catch (error) {
      setUser(null);
      setToken(null);
      clearAccessToken();
      throw error;
    }
  }

  function logout() {
    clearAccessToken();
    setToken(null);
    setUser(null);
    setIsBootstrapping(false);
  }

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      setToken: login,
      logout,
      isAuthenticated: !!user,
      isBootstrapping,
    }),
    [isBootstrapping, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
