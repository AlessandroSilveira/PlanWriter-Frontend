import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  normalizeAuthTokens,
  refreshAccessToken,
  setAuthSession,
} from "../api/http";
import { logoutAllSessions, logoutSession } from "../api/auth";

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

  function applyAuthenticatedSession(rawSession) {
    const normalized = normalizeAuthTokens(rawSession);
    if (!normalized.accessToken) {
      throw new Error("Token inválido recebido do servidor.");
    }

    const decoded = decodeJwtPayload(normalized.accessToken);
    if (!decoded || isExpired(decoded)) {
      throw new Error("Token expirado.");
    }

    const mapped = mapUserFromClaims(decoded);
    if (!mapped?.email) {
      throw new Error("Claims de autenticação inválidas.");
    }

    setAuthSession(normalized);
    setToken(normalized.accessToken);
    setUser(mapped);
    setIsBootstrapping(false);

    return mapped;
  }

  function clearLocalSession() {
    clearAuthSession();
    setToken(null);
    setUser(null);
    setIsBootstrapping(false);
  }

  useEffect(() => {
    let alive = true;

    const bootstrapSession = async () => {
      const storedToken = getAccessToken();
      const storedRefreshToken = getRefreshToken();

      if (storedToken && !storedRefreshToken) {
        try {
          applyAuthenticatedSession({ accessToken: storedToken });
          if (!alive) return;
          return;
        } catch {
          if (!alive) return;
          clearLocalSession();
          return;
        }
      }

      if (storedToken && storedRefreshToken) {
        try {
          applyAuthenticatedSession({
            accessToken: storedToken,
            refreshToken: storedRefreshToken,
          });
          if (!alive) return;
          return;
        } catch {
          // tenta renovação silenciosa abaixo
        }
      }

      if (!storedToken && storedRefreshToken) {
        try {
          const refreshed = await refreshAccessToken();
          if (!alive) return;
          applyAuthenticatedSession(refreshed);
          return;
        } catch {
          // fallback para /profile/me
        }
      }

      if (storedToken && storedRefreshToken) {
        try {
          const refreshed = await refreshAccessToken();
          if (!alive) return;
          applyAuthenticatedSession(refreshed);
          return;
        } catch {
          // fallback para /profile/me
        }
      }

      try {
        // Bootstrap via cookie-backed session when available.
        const { data } = await api.get("/profile/me", {
          skipAuthRedirectOn401: true,
          skipAuthRefreshOn401: true,
        });

        if (!alive) return;

        const sessionUser = mapUserFromClaims(data);
        if (sessionUser?.email) {
          setUser(sessionUser);
          setToken(getAccessToken());
          setIsBootstrapping(false);
          return;
        }

        throw new Error("No session claims.");
      } catch {
        if (!alive) return;
        clearLocalSession();
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

  function login(rawSession) {
    if (typeof rawSession !== "string" && (!rawSession || typeof rawSession !== "object")) {
      throw new Error("Sessão inválida recebida do servidor.");
    }

    try {
      return applyAuthenticatedSession(
        typeof rawSession === "string"
          ? { accessToken: rawSession }
          : rawSession
      );
    } catch (error) {
      clearLocalSession();
      throw error;
    }
  }

  async function logout() {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await logoutSession(refreshToken);
      }
    } catch {
      // logout local deve continuar mesmo com falha remota
    } finally {
      clearLocalSession();
    }
  }

  async function logoutAll() {
    try {
      await logoutAllSessions();
    } catch {
      // logout local deve continuar mesmo com falha remota
    } finally {
      clearLocalSession();
    }
  }

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      setToken: login,
      logout,
      logoutAll,
      isAuthenticated: !!user,
      isBootstrapping,
    }),
    [isBootstrapping, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
