import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import path from 'node:path'

const topicsDir = path.resolve(__dirname, '../topics')

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN
const sentryRelease = process.env.VITE_APP_RELEASE
const sentryOrg = process.env.SENTRY_ORG
const sentryProject = process.env.SENTRY_PROJECT

const sentryPlugin =
  sentryAuthToken && sentryRelease && sentryOrg && sentryProject
    ? sentryVitePlugin({
        org: sentryOrg,
        project: sentryProject,
        authToken: sentryAuthToken,
        release: { name: sentryRelease },
        sourcemaps: {
          filesToDeleteAfterUpload: ['./dist/**/*.map'],
        },
      })
    : null

export default defineConfig({
  base: '/assessment/',
  build: {
    sourcemap: sentryPlugin ? 'hidden' : false,
  },
  plugins: [
    react(),
    ...(sentryPlugin ? [sentryPlugin] : []),
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
