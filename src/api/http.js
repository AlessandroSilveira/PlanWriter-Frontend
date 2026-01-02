// src/api/http.js
import axios from "axios";

// 1) Base URL
// - Se você usar proxy do Vite (vite.config.js), deixe VITE_API_URL em branco e use caminhos relativos.
// - Se preferir chamar a API diretamente, defina VITE_API_URL="http://localhost:5000/api" no .env.
const baseURL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "/api";

const api = axios.create({
  baseURL,
  withCredentials: false,
});

// 2) Interceptor p/ Authorization: Bearer <token>
api.interceptors.request.use((config) => {
  try {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("jwt") ||
      null;

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore
  }
  return config;
});

export default api;
