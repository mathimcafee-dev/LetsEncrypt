import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'process', 'stream', 'util'],
      globals: { Buffer: true, process: true, global: true },
    }),
  ],
  optimizeDeps: {
    include: ['node-forge'],
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/app-[hash].js`,
        chunkFileNames: `assets/chunk-[hash].js`,
      }
    }
  }
})
