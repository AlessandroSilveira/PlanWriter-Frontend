import axios from 'axios'

const api = axios.create({
  baseURL: 'https://localhost:56133/api', // ajuste se a porta for diferente
})

// intercepta cada request e adiciona o token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token') // supondo que você salva o JWT no login
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
