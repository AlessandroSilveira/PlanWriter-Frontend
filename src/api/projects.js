import axios from 'axios'

export const getProjects = async () => {
  const { data } = await axios.get('/projects')
  return data
}

export const getProject = async (id) => {
  const { data } = await axios.get(`/projects/${id}`)
  return data
}

export const getProjectHistory = async (id) => {
  const { data } = await axios.get(`/projects/${id}/progress`)
  return data
}

export const addProgress = async (projectId, payload) => {
  const { data } = await axios.post(`/projects/${projectId}/progress`, payload)
  return data
}

export const deleteProgress = async (progressId) => {
  await axios.delete(`/progress/${progressId}`)
}

export const setGoal = async (projectId, payload) => {
  const { data } = await axios.post(`/projects/${projectId}/goal`, payload)
  return data
}
