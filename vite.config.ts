import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Minimal ambient declaration so tsc doesn't require @types/node just to read
// two optional dev-proxy env vars in this config file.
declare const process: { env: Record<string, string | undefined> }

// Dev-only: proxy /api to a deployed Certus app so the UI can be developed
// against live Lakebase data. Enabled only when CERTUS_API is set; pass a
// short-lived OAuth token via CERTUS_TOKEN (see README → Local development).
const apiTarget = process.env.CERTUS_API
const apiToken = process.env.CERTUS_TOKEN

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: apiTarget
      ? {
          '/api': {
            target: apiTarget,
            changeOrigin: true,
            secure: true,
            headers: apiToken ? { Authorization: `Bearer ${apiToken}` } : {},
          },
        }
      : undefined,
  },
})
