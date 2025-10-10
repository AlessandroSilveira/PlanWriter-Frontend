import { api } from "./client";

export async function getRegionsLeaderboard() {
  const { data } = await api.get("/regions/leaderboard");
  return data; // [{ regionId, region, totalWords, userCount }]
}
