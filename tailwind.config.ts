import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand Color System
        primary: {
          DEFAULT: '#6366f1', // Deep Purple
          hover: '#4f46e5', // Dark Purple
          light: '#818cf8', // Light Purple
        },
        accent: {
          purple: '#667eea', // Logo Purple
          violet: '#764ba2', // Logo Violet
          pink: '#f093fb', // Logo Pink
        },
        text: {
          primary: '#1f2937', // Charcoal
          secondary: '#6b7280', // Gray
        },
        background: {
          DEFAULT: '#f8fafc', // Light Gray
          card: '#ffffff', // White
        },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        'gradient-primary': 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      },
    },
  },
  plugins: [],
}
export default config
