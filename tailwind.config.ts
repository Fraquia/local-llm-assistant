import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

export default {
  content: [
    './src/taskpane/**/*.{ts,tsx}',
    './taskpane.html',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      typography: {
        sm: {
          css: {
            fontSize: '0.8125rem',
            lineHeight: '1.6',
            p: { marginTop: '0.5em', marginBottom: '0.5em' },
            'h1,h2,h3,h4': { marginTop: '1em', marginBottom: '0.4em' },
            h1: { fontSize: '1.125em' },
            h2: { fontSize: '1em' },
            h3: { fontSize: '0.9375em' },
            li: { marginTop: '0.15em', marginBottom: '0.15em' },
            'ul,ol': { marginTop: '0.4em', marginBottom: '0.4em' },
            blockquote: {
              fontStyle: 'normal',
              borderLeftWidth: '3px',
            },
            code: {
              fontSize: '0.8em',
              fontWeight: '500',
              padding: '0.15em 0.3em',
              borderRadius: '0.25rem',
              backgroundColor: 'var(--tw-prose-pre-bg)',
            },
            'code::before': { content: 'none' },
            'code::after': { content: 'none' },
            pre: {
              fontSize: '0.8em',
              borderRadius: '0.5rem',
              padding: '0.75em 1em',
            },
          },
        },
      },
    },
  },
  plugins: [typography],
} satisfies Config;
