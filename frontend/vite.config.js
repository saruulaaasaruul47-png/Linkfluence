import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
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
})
