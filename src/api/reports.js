import api from "./http";

export async function getWritingReport({
  period = "month",
  startDate,
  endDate,
  projectId,
} = {}) {
  const params = {
    period,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    projectId: projectId || undefined,
  };

  const { data } = await api.get("/reports/writing", { params });
  return data;
}
