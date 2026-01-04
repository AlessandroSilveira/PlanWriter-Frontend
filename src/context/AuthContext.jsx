import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(
    () => localStorage.getItem("token")
  );

useEffect(() => {
  if (!token || typeof token !== "string") {
    setUser(null);
    return;
  }

  try {
    const payloadBase64 = token.split(".")[1];
    const decoded = JSON.parse(atob(payloadBase64));

    setUser({
      id: decoded.nameid || decoded.sub || null,
      email: decoded.email || null,
      isAdmin: decoded.isAdmin === "true",
      mustChangePassword: decoded.mustChangePassword === "true",
    });
  } catch {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
  }
}, [token]);


  function login(newToken) {
  localStorage.setItem("token", newToken);
  setToken(newToken);

  // ✅ Decodifica e seta user imediatamente (evita race condition com ProtectedRoute)
  try {
    const payloadBase64 = newToken.split(".")[1];
    const payloadJson = atob(payloadBase64);
    const decoded = JSON.parse(payloadJson);

    setUser({
      id: decoded.nameid || decoded.sub || null,
      email: decoded.email || null,
      isAdmin: decoded.isAdmin === "true",
      mustChangePassword: decoded.mustChangePassword === "true",
    });
  } catch (err) {
    console.error("Token inválido no login()", err);
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    throw err;
  }
}

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }

  const isAuthenticated = !!user;

return (
  <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated }}>
    {children}
  </AuthContext.Provider>
);

}

export const useAuth = () => useContext(AuthContext);
