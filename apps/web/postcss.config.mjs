import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  plugins: {
    tailwindcss: {
      config: path.resolve(__dirname, './tailwind.config.mjs'),
    },
    autoprefixer: {},
  },
};

export default config;
