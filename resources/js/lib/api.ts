import axios from 'axios'

// No auth in this app: only the 419 (expired CSRF token) case needs handling.
const api = axios.create({
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: 'application/json' },
})

api.interceptors.response.use(undefined, error => {
  if (axios.isAxiosError(error) && error.response?.status === 419) {
    window.location.reload()
    return Promise.reject(new Error('Session expired'))
  }

  return Promise.reject(error)
})

export default api
