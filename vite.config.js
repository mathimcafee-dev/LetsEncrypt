// BUILD: 1780300599493
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
        // Split vendor libraries into separate cached chunks
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor-react'
          if (id.includes('node_modules/@supabase')) return 'vendor-supabase'
          if (id.includes('node_modules/lucide-react') || id.includes('node_modules/date-fns')) return 'vendor-ui'
          if (id.includes('node_modules/')) return 'vendor'
        },
      },
    },
    // Raise warning threshold — we know about the size
    chunkSizeWarningLimit: 600,
  },
})

