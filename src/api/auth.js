// src/api/auth.js
import api from "./http";

export async function login(payload) {
  const response = await api.post("/auth/login", payload);


  return (
    response.data.accessToken ??
    response.data.AccessToken ??
    response.data.token ??
    null
  );
}

// 👇 alias para compatibilidade
export const loginApi = login;

export async function register({ firstName, lastName, dateOfBirth, email, password }) {
  // Garante formato de data compatível: "YYYY-MM-DD"
  const formattedDate = new Date(dateOfBirth).toISOString().split("T")[0];

  const payload = {
    FirstName: firstName,
    LastName: lastName,
    DateOfBirth: formattedDate,
    Email: email,
    Password: password,
  };

  console.log("📦 Enviando para backend:", payload);

  const { data } = await api.post("/auth/register", payload);
  return data;
}
export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("jwt");
}
