// src/api/auth.js
import api from "./http.js";

// Login — aceita backends que usam Email/Username/Login
export const loginApi = async (email, password) => {
  const body = { email, username: email, login: email, password };
  const { data } = await api.post("/auth/login", body);
  return data; // { token } | { accessToken } | ...
};

// ✅ Registrar — faltava essa exportação nomeada
export const registerApi = async (email, password) => {
  const body = { email, username: email, login: email, password };
  const { data } = await api.post("/auth/register", body);
  return data;
};
