import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,   // allow connections from any interface
    port: 5173    // or your preferred port
  }
})