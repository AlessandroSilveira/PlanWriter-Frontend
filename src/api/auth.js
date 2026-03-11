// src/api/auth.js
import api, { getRefreshToken, normalizeAuthTokens } from "./http";

export async function login(payload) {
  const response = await api.post("/auth/login", payload);
  return normalizeAuthTokens(response?.data);
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

export async function logoutSession(rawRefreshToken = null) {
  const refreshToken = rawRefreshToken || getRefreshToken();
  if (!refreshToken) return;

  await api.post(
    "/auth/logout",
    { refreshToken },
    {
      skipAuthRedirectOn401: true,
      skipAuthRefreshOn401: true,
    }
  );
}

export async function logoutAllSessions() {
  await api.post(
    "/auth/logout-all",
    {},
    {
      skipAuthRedirectOn401: true,
      skipAuthRefreshOn401: true,
    }
  );
}

export async function forgotPassword({ email }) {
  const { data } = await api.post("/auth/forgot-password", {
    Email: email,
  });
  return data;
}

export async function resetPassword({ token, newPassword }) {
  const { data } = await api.post("/auth/reset-password", {
    Token: token,
    NewPassword: newPassword,
  });
  return data;
}

export function logout() {
  return logoutSession();
}
