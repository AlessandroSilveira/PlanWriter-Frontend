import { createContext, useContext, useEffect, useState } from "react";

// Lê token salvo e ignora "null"/"undefined" e JWT expirado
function getStoredToken() {
  try {
    const raw = localStorage.getItem("token");
    if (!raw || raw === "null" || raw === "undefined") return null;
    if (raw.startsWith("{") || raw.startsWith("[")) {
      const obj = JSON.parse(raw);
      if (typeof obj === "string") return obj;
      if (obj?.token) return obj.token;
      return null;
    }
    const parts = raw.split(".");
    if (parts.length === 3) {
      const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(atob(b64));
      if (payload?.exp && Date.now() / 1000 >= payload.exp) return null;
    }
    return raw;
  } catch {
    return null;
  }
}

// 👉 exportamos também o contexto por compatibilidade
export const AuthContext = createContext({
  token: null,
  isAuthenticated: false,
  setToken: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(getStoredToken());

  const setToken = (t) => {
    if (t && t !== "null" && t !== "undefined") {
      localStorage.setItem("token", t);
      setTokenState(t);
    } else {
      localStorage.removeItem("token");
      setTokenState(null);
    }
  };

  const logout = () => {
    try { localStorage.removeItem("token"); } catch {}
    setTokenState(null);
  };

  useEffect(() => {
    const cur = getStoredToken();
    if (cur !== token) setToken(cur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, setToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
