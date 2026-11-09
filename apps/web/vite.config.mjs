import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@navrix/config': path.resolve(__dirname, '../../packages/config/src/index.ts'),
      '@navrix/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
      '@navrix/ui': path.resolve(__dirname, '../../packages/ui/src/index.tsx'),
      '@navrix/validation': path.resolve(__dirname, '../../packages/validation/src/index.ts'),
      'next/link': path.resolve(__dirname, './src/compat/Link.jsx'),
      'next/navigation': path.resolve(__dirname, './src/compat/navigation.js'),
      'next/image': path.resolve(__dirname, './src/compat/Image.jsx'),
      'next/font/google': path.resolve(__dirname, './src/compat/font.js'),
      'next/dynamic': path.resolve(__dirname, './src/compat/dynamic.jsx'),
    },
  },
  define: {
    'process.env.NEXT_PUBLIC_API_URL': JSON.stringify('/api/v1'),
    'process.env.NEXT_PUBLIC_ADMIN_URL': JSON.stringify(''),
    'process.env': {},
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true,
  },
});
