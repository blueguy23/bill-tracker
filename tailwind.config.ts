import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        depth: {
          950: '#020d1a',
          900: '#030f1e',
          850: '#041426',
          800: '#071a32',
          700: '#0a2440',
          600: '#0e3155',
        },
        ocean: {
          glow: '#0ea5e9',
          accent: '#14b8a6',
          muted: '#164e63',
        },
      },
      keyframes: {
        'ocean-drift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        'ocean-drift': 'ocean-drift 20s ease infinite',
      },
    },
  },
  plugins: [],
};

export default config;
