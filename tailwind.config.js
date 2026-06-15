/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // WViral design tokens
        wv: {
          indigo: '#6E5BFF',
          teal: '#1FD3A3',
          blue: '#4D7CFF',
          bg: '#F6F6F3',
          surface: '#FFFFFF',
          border: '#ECECE8',
          text: '#0B0B0C',
          muted: '#8C8C88',
          'indigo-light': '#9FB2FF',
        },
        // Legacy compat
        primary: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          500: '#6E5BFF',
          600: '#6E5BFF',
          700: '#5B4FE8',
        },
        brand: {
          green: '#1FD3A3',
          'green-light': '#D1FAE5',
        },
      },
      fontFamily: {
        sans: ['var(--font-archivo)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,.04), 0 10px 30px rgba(0,0,0,.04)',
      },
    },
  },
  plugins: [],
}
