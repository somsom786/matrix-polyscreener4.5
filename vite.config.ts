import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy Polymarket Gamma API to bypass CORS
      '/api/gamma': {
        target: 'https://gamma-api.polymarket.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gamma/, ''),
        secure: true,
      },
      // Proxy CLOB API
      '/api/clob': {
        target: 'https://clob.polymarket.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/clob/, ''),
        secure: true,
      },
      // Proxy Data API for holders/positions
      '/api/data': {
        target: 'https://data-api.polymarket.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/data/, ''),
        secure: true,
      }
    }
  }
})
