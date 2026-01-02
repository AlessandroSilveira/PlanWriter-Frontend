// src/api/profile.js
import api from "./http";

export async function getMyProfile() {
  const { data } = await api.get("/profile/me");
  return data;
}

export async function updateMyProfile(payload) {
  const { data } = await api.put("/profile/me", payload);
  return data;
}

export async function getPublicProfile(slug) {
  const { data } = await api.get(`/profile/${encodeURIComponent(slug)}`);
  return data;
}
