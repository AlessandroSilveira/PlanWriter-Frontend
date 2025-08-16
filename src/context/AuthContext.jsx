// src/context/AuthContext.jsx
import { createContext, useState, useEffect } from "react";
import api from "../api/http"; // opcional, mas útil se quiser interceptors globais também

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || null);

  useEffect(() => {
    // nada aqui: quem injeta o token é o interceptor do http.js via localStorage
  }, [token]);

  // 🔧 aceita vários nomes comuns para o token
  const login = (payload) => {
    const t =
      payload?.accessToken ||
      payload?.token ||
      payload?.jwt ||
      payload?.id_token ||
      null;

    if (!t) {
      throw new Error("Token não encontrado na resposta de login.");
    }
    localStorage.setItem("token", t);
    setToken(t);
    setUser(payload?.user ?? null);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
