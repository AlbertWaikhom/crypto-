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
      'next/link': path.resolve(__dirname, './src/compat/Link.tsx'),
      'next/navigation': path.resolve(__dirname, './src/compat/navigation.ts'),
      'next/image': path.resolve(__dirname, './src/compat/Image.tsx'),
      'next/font/google': path.resolve(__dirname, './src/compat/font.ts'),
      'next/dynamic': path.resolve(__dirname, './src/compat/dynamic.tsx'),
    },
  },
  define: {
    'process.env.NEXT_PUBLIC_API_URL': JSON.stringify(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'),
    'process.env.NEXT_PUBLIC_ADMIN_URL': JSON.stringify(process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001'),
    'process.env.NEXT_PUBLIC_APP_URL': JSON.stringify(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
    'process.env': {},
  },
  server: {
    port: 3001,
    host: '0.0.0.0',
    strictPort: true,
  },
});
