import axios from 'axios'

export const loginApi = async (email, password) => {
  const { data } = await axios.post('/auth/login', { email, password })
  return data // { accessToken, refreshToken?, expiresAt?, user? }
}

export const registerApi = async (email, password) => {
  const { data } = await axios.post('/auth/register', { email, password })
  return data
}
