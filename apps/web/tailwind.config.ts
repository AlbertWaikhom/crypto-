import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './src/**/*.{ts,tsx,js,jsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
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

