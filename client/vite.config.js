import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins:[react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        secure: false,
      },
      '/certificates': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        secure: false,
      },
      '/chat_uploads': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        secure: false,
        ws: true,
      }
    }
  }
})