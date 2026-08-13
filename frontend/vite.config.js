import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function productionEnvironmentGuard(mode) {
  if (mode !== 'production') return null

  const environment = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '')
  const apiBaseUrl = environment.VITE_API_BASE_URL?.trim()
  if (!apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL is required for a production build.')
  }

  let parsedApiUrl
  try {
    parsedApiUrl = new URL(apiBaseUrl)
  } catch {
    throw new Error('VITE_API_BASE_URL must be an absolute URL for a production build.')
  }
  if (parsedApiUrl.protocol !== 'https:' || !parsedApiUrl.pathname.replace(/\/$/, '').endsWith('/api/v1')) {
    throw new Error('VITE_API_BASE_URL must use HTTPS and end with /api/v1 for a production build.')
  }

  if (!environment.VITE_GOOGLE_CLIENT_ID?.endsWith('.apps.googleusercontent.com')) {
    throw new Error('VITE_GOOGLE_CLIENT_ID must be a Google Web client ID for a production build.')
  }

  return null
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  productionEnvironmentGuard(mode)

  return {
    plugins: [react(), tailwindcss()],
    build: {
      rolldownOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            if (id.includes('motion')) return 'motion'
            if (id.includes('lucide-react')) return 'icons'
            if (id.includes('react')) return 'framework'
            return 'vendor'
          },
        },
      },
    },
  }
})
