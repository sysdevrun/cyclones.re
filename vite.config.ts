import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path for relative deployment
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
