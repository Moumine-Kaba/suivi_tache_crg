/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        crg: {
          primary: 'rgb(var(--accent-primary-rgb) / <alpha-value>)',
          secondary: 'rgb(var(--accent-primary-hover-rgb) / <alpha-value>)',
          accent: 'rgb(var(--accent-primary-rgb) / <alpha-value>)',
          dark: 'rgb(var(--accent-primary-hover-rgb) / <alpha-value>)',
        },
        background: 'var(--bg-background)',
        card: 'var(--bg-card)',
        border: 'var(--border-color)',
        foreground: 'var(--text-foreground)',
        muted: 'var(--text-muted)',
        input: 'var(--bg-input)',
        success: 'var(--accent-success)',
        danger: 'var(--accent-error)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
      },
      keyframes: {
        'float-slow': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(15px, -20px) scale(1.03)' },
          '66%': { transform: 'translate(-15px, 15px) scale(0.97)' },
        },
        'float-slower': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '50%': { transform: 'translate(-20px, -15px)' },
        },
        'login-form-in': {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'login-error-in': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'login-field': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'float-slow': 'float-slow 12s ease-in-out infinite',
        'float-slower': 'float-slower 18s ease-in-out infinite',
        'login-form-in': 'login-form-in 0.5s ease-out forwards',
        'login-error-in': 'login-error-in 0.3s ease-out',
        'login-field': 'login-field 0.4s ease-out both',
      },
    },
  },
  plugins: [],
}


















