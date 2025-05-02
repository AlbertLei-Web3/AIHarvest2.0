/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#e2336b',
          hover: '#d12c60'
        },
        secondary: {
          DEFAULT: '#fcac46',
          hover: '#f9a02e'
        },
        dark: {
          DEFAULT: '#1a1a2e',
          light: '#16213e',
          lighter: '#0f3460'
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      keyframes: {
        'bounce-slow': {
          '0%, 100%': {
            transform: 'translateY(-15%)',
            animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)'
          },
          '50%': {
            transform: 'translateY(0)',
            animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)'
          }
        },
        'bounce-slow-reverse': {
          '0%, 100%': {
            transform: 'translateY(0)',
            animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)'
          },
          '50%': {
            transform: 'translateY(-15%)',
            animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)'
          }
        },
        'wave': {
          '0%': {
            backgroundPositionX: '0px'
          },
          '100%': {
            backgroundPositionX: '1000px'
          }
        },
        'wave-reverse': {
          '0%': {
            backgroundPositionX: '0px'
          },
          '100%': {
            backgroundPositionX: '-1000px'
          }
        },
        'float': {
          '0%, 100%': {
            transform: 'translateY(0) scale(1)',
          },
          '50%': {
            transform: 'translateY(-20px) scale(1.05)',
          }
        },
        'float-reverse': {
          '0%, 100%': {
            transform: 'translateY(0) scale(1)',
          },
          '50%': {
            transform: 'translateY(20px) scale(1.05)',
          }
        },
        'float-slow': {
          '0%, 100%': {
            transform: 'translateY(0) translateX(0)',
          },
          '25%': {
            transform: 'translateY(-15px) translateX(15px)',
          },
          '50%': {
            transform: 'translateY(0) translateX(30px)',
          },
          '75%': {
            transform: 'translateY(15px) translateX(15px)',
          }
        },
        'twinkle': {
          '0%, 100%': {
            opacity: 1,
          },
          '50%': {
            opacity: 0.5,
          }
        }
      },
      animation: {
        'bounce-slow': 'bounce-slow 1.5s infinite',
        'bounce-slow-reverse': 'bounce-slow-reverse 1.5s infinite',
        'wave': 'wave 30s linear infinite',
        'wave-reverse': 'wave-reverse 15s linear infinite',
        'float': 'float 8s ease-in-out infinite',
        'float-reverse': 'float-reverse 9s ease-in-out infinite',
        'float-slow': 'float-slow 12s ease-in-out infinite',
        'twinkle': 'twinkle 3s ease-in-out infinite'
      }
    },
  },
  plugins: [],
} 