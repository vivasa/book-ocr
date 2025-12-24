import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/extract': {
        // Default to the deployed Cloud Run OCR service so frontend-v2 works without a local backend.
        // Override for local dev if desired:
        //   VITE_PROXY_TARGET=http://127.0.0.1:8080 npm run dev
        target:
          process.env.VITE_PROXY_TARGET ||
          'https://telugu-ocr-prod-777583762558.us-central1.run.app',
        changeOrigin: true,
      },
    },
  },
})
