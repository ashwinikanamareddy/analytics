import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite configuration for the frontend dev server.
// Documentation: https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // The port the React dev server will run on
  },
})
