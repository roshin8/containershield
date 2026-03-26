import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: '',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: mode === 'development',
    minify: mode === 'production',
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
        inject: resolve(__dirname, 'src/inject/index.ts'),
        popup: resolve(__dirname, 'src/popup/index.html'),
        'ip-warning': resolve(__dirname, 'src/pages/ip-warning.html'),
        onboarding: resolve(__dirname, 'src/pages/onboarding.html'),
        options: resolve(__dirname, 'src/pages/options.html'),
      },
      output: {
        format: 'es',
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'background/index.js';
          if (chunkInfo.name === 'content') return 'content/index.js';
          if (chunkInfo.name === 'inject') return 'inject/index.js';
          if (chunkInfo.name === 'popup') return 'popup/index.js';
          if (chunkInfo.name === 'ip-warning') return 'pages/ip-warning.js';
          if (chunkInfo.name === 'onboarding') return 'pages/onboarding.js';
          if (chunkInfo.name === 'options') return 'pages/options.js';
          return '[name].js';
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Force content/inject to include all dependencies inline
        manualChunks(id, { getModuleIds, getModuleInfo }) {
          // Only create chunks for React (used by popup/pages)
          if (id.includes('node_modules/react')) {
            return 'jsx-runtime';
          }
          // Everything else gets inlined into the entry point
          return undefined;
        },
      },
      // Ensure tree-shaking doesn't remove needed code
      treeshake: {
        moduleSideEffects: true,
      },
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode || 'development'),
  },
}));
