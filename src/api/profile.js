// src/api/profile.js
import axios from "axios";

export async function getMyProfile() {
  const { data } = await axios.get("/api/profile/me");
  return data;
}

export async function updateMyProfile(payload) {
  const { data } = await axios.put("/api/profile/me", payload);
  return data;
}

export async function getPublicProfile(slug) {
  const { data } = await axios.get(`/api/profile/${slug}`);
  return data;
}
