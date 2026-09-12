/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        legal: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          500: '#334e68',
          600: '#243b53',
          700: '#102a43',
          800: '#091e36',
          900: '#061727',
        },
        pass: {
          50: '#f0fff4',
          500: '#38a169',
          700: '#276749',
        },
        fail: {
          50: '#fff5f5',
          500: '#e53e3e',
          700: '#9b2c2c',
        },
        review: {
          50: '#fffaf0',
          500: '#dd6b20',
          700: '#9c4221',
        },
        na: {
          50: '#f7fafc',
          500: '#718096',
          700: '#4a5568',
        }
      }
    },
  },
  plugins: [],
}
