import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

const topicsDir = path.resolve(__dirname, '../topics')

export default defineConfig({
  base: '/assessment/',
  plugins: [
    react(),
    {
      name: 'watch-topics-md',
      configureServer(server) {
        // topics/ вне app/ — без этого новые .md не попадают в import.meta.glob до рестарта
        server.watcher.add(topicsDir)
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@topics': topicsDir,
    },
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
