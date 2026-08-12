import { io } from 'socket.io-client'
import { API_BASE_URL } from './axiosClient'
import { tokenStore } from './tokenStore'

function socketOrigin() {
  if (API_BASE_URL.startsWith('http')) return API_BASE_URL.replace(/\/api\/v1\/?$/, '')
  return window.location.origin
}

export function createRealtimeClient() {
  return io(socketOrigin(), {
    autoConnect: false,
    auth: { token: tokenStore.get() },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 400,
    reconnectionDelayMax: 4000,
  })
}
