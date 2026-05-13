import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // allow requests from ngrok URL
    allowedHosts: [
      'lashonda-somnolent-sootily.ngrok-free.dev',
      "nontravelling-fabled-tari.ngrok-free.dev"
      // you can add more hosts if needed
    ],
  },
})
