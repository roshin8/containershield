import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV === 'development',
    rollupOptions: {
      input: {
        // Background script
        background: resolve(__dirname, 'src/background/index.ts'),
        // Content script (runs in content script context)
        content: resolve(__dirname, 'src/content/index.ts'),
        // Inject script (runs in MAIN world / page context)
        inject: resolve(__dirname, 'src/inject/index.ts'),
        // Popup UI
        popup: resolve(__dirname, 'src/popup/index.html'),
        // IP warning page
        'ip-warning': resolve(__dirname, 'src/pages/ip-warning.html'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Keep scripts in their respective folders
          if (chunkInfo.name === 'background') return 'background/index.js';
          if (chunkInfo.name === 'content') return 'content/index.js';
          if (chunkInfo.name === 'inject') return 'inject/index.js';
          if (chunkInfo.name === 'popup') return 'popup/index.js';
          if (chunkInfo.name === 'ip-warning') return 'pages/ip-warning.js';
          return '[name].js';
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Don't minify for easier debugging during development
    minify: process.env.NODE_ENV === 'production',
  },
  // Define globals for the extension environment
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
});
