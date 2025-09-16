// src/api/auth.js
import api from "./http";

export const loginApi = async (email, password) => {
  // envia campos redundantes para compatibilidade com DTOs diferentes
  const body = { email, username: email, login: email, password };
  const { data } = await api.post("/auth/login", body);
  const token = data?.AccessToken || data?.accessToken || data?.token || data?.jwt || null;
  return { raw: data, token };
};

export const registerApi = async (email, password) => {
  const body = { email, username: email, login: email, password };
  const { data } = await api.post("/auth/register", body);
  return data;
};
