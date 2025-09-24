import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Exclude backend directory from build
    rollupOptions: {
      external: ['nodemailer', 'canvas', 'qrcode']
    }
  },
  optimizeDeps: {
    // Exclude Node.js modules from dependency optimization
    exclude: ['nodemailer', 'canvas', 'qrcode', 'backend']
  },
  server: {
    fs: {
      // Deny access to backend directory
      deny: ['**/backend/**']
    }
  }
})
