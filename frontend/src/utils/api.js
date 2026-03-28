import axios from 'axios'

const baseUrl =
  import.meta.env.VITE_environment === 'development'
    ? 'http://localhost:8000/api'
    : 'https://chalchitra.iitmandi.ac.in/api'

export const api = axios.create({
  baseURL: baseUrl,
  withCredentials: true
})

// ✅ ADD THIS
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') // or wherever you store it

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})
