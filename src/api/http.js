// src/api/http.js (ou http.jsx)
import axios from "axios";

const api = axios.create({
  // use o proxy do Vite com "/api" em dev, ou VITE_API_URL p/ apontar direto
  baseURL: import.meta?.env?.VITE_API_URL || "/api",
  // withCredentials: true, // se sua autenticação usar COOKIE em vez de Bearer
});

// Injeta Authorization: Bearer <token> se existir no localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  config.headers = config.headers || {};

  // Útil p/ ASP.NET diferenciar requisições AJAX e responder JSON
  config.headers["X-Requested-With"] = "XMLHttpRequest";

  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Log básico de erros de API
api.interceptors.response.use(
  (r) => r,
  (e) => {
    const status = e?.response?.status;
    const data = e?.response?.data;
    console.error("API error:", status, data || e.message);
    // opcional: se 401, limpar token
    if (status === 401) {
      localStorage.removeItem("token");
    }
    return Promise.reject(e);
  }
);

export default api;
