import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.getPlatform() !== 'web'
const isDev = window.location.hostname === 'localhost'
//const isNative = Capacitor.isNativePlatform();

export const API_BASE_URL = isNative
    ? 'https://malaikaserver-production.up.railway.app'
    : isDev
        ? 'http://localhost:5000'
        : import.meta.env.VITE_API_BASE_URL; // Web production pakai ini

console.log('📱 isNative:', isNative);
console.log('🌐 API_BASE_URL:', API_BASE_URL);