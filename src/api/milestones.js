// src/api/milestones.js
import api from "./http";

export const listMilestones = async (projectId) => {
  const { data } = await api.get(`/projects/${projectId}/milestones`);
  return Array.isArray(data) ? data : [];
};

export const createMilestone = async (projectId, payload) => {
  const { data } = await api.post(
    `/projects/${projectId}/milestones`,
    payload
  );
  return data;
};

export const deleteMilestone = async (projectId, milestoneId) => {
  await api.delete(
    `/projects/${projectId}/milestones/${milestoneId}`
  );
};
