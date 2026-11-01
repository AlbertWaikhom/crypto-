import type { Config } from 'tailwindcss';

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

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './src/**/*.{ts,tsx,js,jsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
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
