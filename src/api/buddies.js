// src/api/buddies.js
import api from "./http"; // wrapper axios já existente

export async function listBuddies() {
  const { data } = await api.get("/buddies");
  return data; // [{ userId, username, displayName, avatarUrl }]
}

export async function followByEmail(email) {
  await api.post("/buddies/follow/username", { email });
}

export async function followById(followeeId) {
  await api.post(`/buddies/follow/${followeeId}`);
}

export async function unfollow(followeeId) {
  await api.delete(`/buddies/${followeeId}`);
}

export async function buddiesLeaderboard(params = {}) {
  const search = new URLSearchParams();
  if (params.eventId) search.set("eventId", params.eventId);
  if (params.start)   search.set("start", params.start); // "YYYY-MM-DD"
  if (params.end)     search.set("end", params.end);
  const qs = search.toString();
  const { data } = await api.get(`/buddies/leaderboard${qs ? `?${qs}` : ""}`);
  return data; // [{ userId, username, displayName, total, paceDelta }]
}
