const isLocalhost = window.location.hostname === 'localhost'

export const API_BASE_URL = isLocalhost
    ? 'http://localhost:5000' // 
    : import.meta.env.VITE_API_BASE_URL // 
