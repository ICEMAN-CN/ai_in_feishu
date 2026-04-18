/** @type {import('tailwindcss').Config} */
export default {
  content: ['./admin/index.html', './admin/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Feishu brand colors
        primary: '#FE5746',
        secondary: '#00A9FF',
        success: '#00C269',
        warning: '#FFB800',
        error: '#FF3B3B',
        surface: '#FFFFFF',
        background: '#F7F8FA',
        'text-primary': '#1F2329',
        'text-secondary': '#646A73',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
      },
    },
  },
  plugins: [],
};
