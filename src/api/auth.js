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
  // Input type="date" já entrega "YYYY-MM-DD"; evita parse UTC desnecessário.
  const formattedDate = typeof dateOfBirth === "string" ? dateOfBirth : "";

  const payload = {
    FirstName: firstName,
    LastName: lastName,
    DateOfBirth: formattedDate,
    Email: email,
    Password: password,
  };

  const { data } = await api.post("/auth/register", payload);
  return data;
}

export function logout() {
  return Promise.resolve();
}
