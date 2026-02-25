import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/sidepanel/**/*.{ts,tsx}',
    './public/sidepanel.html',
  ],
  darkMode: 'media',
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
