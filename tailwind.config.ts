import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#5B2D8E',
          orange: '#F5921E',
          blue: '#0099DB',
          pink: '#E91E63',
          gold: '#FFB300',
          'purple-light': '#7B4DAE',
          'orange-light': '#FFAB40',
          'blue-light': '#4FC3F7',
        },
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #5B2D8E 0%, #0099DB 50%, #F5921E 100%)',
        'gradient-warm': 'linear-gradient(135deg, #F5921E 0%, #E91E63 100%)',
        'gradient-cool': 'linear-gradient(135deg, #0099DB 0%, #5B2D8E 100%)',
      },
      animation: {
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
