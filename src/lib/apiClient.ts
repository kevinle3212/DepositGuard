import axios from 'axios'
import { useWalletStore } from '@/src/store/useWalletStore'

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? '/api',
})

apiClient.interceptors.request.use((config) => {
  const jwt = useWalletStore.getState().firebaseJwt
  if (jwt) {
    config.headers.Authorization = `Bearer ${jwt}`
  }
  return config
})

export default apiClient
