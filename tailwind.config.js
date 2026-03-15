/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        border: 'var(--color-border)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        info: 'var(--color-info)',
        navy: {
          800: '#14243b',
          900: '#1a2e4a',
        },
        teal: {
          500: '#0f7c6e',
          600: '#0c6358',
          700: '#094a42',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['14px', '1.5'], // Enforce minimum 14px 
        sm: ['14px', '1.5'],
        base: ['16px', '1.6'],
        lg: ['18px', '1.6'],
        xl: ['20px', '1.4'],
        '2xl': ['24px', '1.3'],
        '3xl': ['32px', '1.2'],
      },
      maxWidth: {
        container: '1100px',
      }
    },
  },
  plugins: [],
}