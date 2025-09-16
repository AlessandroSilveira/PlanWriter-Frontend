import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

// injeta Authorization: Bearer <token> se existir no localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    // não sobrescreve Authorization se já existir
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;
