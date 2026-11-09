import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const toPosix = (p) => p.replace(/\\/g, '/');

const SF_PRO_STACK = [
  'var(--nv-font-sf)',
  '"SF Pro Display"',
  '"SF Pro Text"',
  '"SF Pro"',
  '-apple-system',
  'BlinkMacSystemFont',
  'var(--font-sf-fallback)',
  '"Helvetica Neue"',
  'Arial',
  'sans-serif',
];

/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    toPosix(path.resolve(__dirname, './index.html')),
    toPosix(path.resolve(__dirname, './src/**/*.{js,jsx,ts,tsx}')),
    toPosix(path.resolve(__dirname, '../../packages/ui/src/**/*.{ts,tsx}')),
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: SF_PRO_STACK,
        mono: SF_PRO_STACK,
      },
      colors: {
        navrix: {
          gold: '#F5B82E',
          goldDark: '#C88D14',
          obsidian: '#070B14',
          surface: '#0E1526',
        },
      },
    },
  },
  plugins: [],
};

export default config;
