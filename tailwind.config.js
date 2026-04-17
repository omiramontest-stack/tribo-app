/** @type {import('tailwindcss').Config} */
import flyonui from 'flyonui'
import flyonuiJs from 'flyonui/plugin'

import defaultTheme from 'tailwindcss/defaultTheme'
const sans = defaultTheme.fontFamily.sans.filter((font) => font !== 'Roboto')

export default {
  darkMode: ['class'],
  content: ['./src/**/*.{vue,js,ts,jsx,tsx}', './node_modules/flyonui/dist/js/*.js'],
  theme: {
    fontFamily: {
      sans: ['Lato', ...sans],
      serif: ['"Gowun Batang"', ...defaultTheme.fontFamily.serif],
    },
    extend: {
      fontSize: {
        '3.5xl': [
          '2rem',
          {
            lineHeight: '38px',
          },
        ],
      },
      backgroundImage: {
        'gradient-radial-light':
          'radial-gradient(circle 300px at 30% -180%, var(--tw-gradient-from) 0%, var(--tw-gradient-to) 100%)',
        'gradient-radial-dark':
          'radial-gradient(circle 300px at 30% -180%, var(--tw-gradient-from) 0%, var(--tw-gradient-to) 100%)',
      },
      colors: {
        brand: {
          primary: {
            light: {
              DEFAULT: '#2563EB', // blue fintech fuerte
              lighter: '#3B82F6',
              dark: '#1D4ED8',
            },
            dark: {
              DEFAULT: '#3B82F6',
              lighter: '#60A5FA',
              dark: '#2563EB',
            },
          },
          secondary: {
            light: {
              DEFAULT: '#0EA5E9', // cyan moderno (tech/wallet)
              lighter: '#38BDF8',
              dark: '#0284C7',
            },
            dark: {
              DEFAULT: '#38BDF8',
              lighter: '#7DD3FC',
              dark: '#0EA5E9',
            },
          },
        },

        default: {
          light: {
            DEFAULT: '#FFFFFF',
            lighter: '#F8FAFC',
            dark: '#E2E8F0',
          },
          dark: {
            DEFAULT: '#0B1220', // más premium que zinc
            lighter: '#111827',
            dark: '#020617',
          },
        },

        accent: {
          light: {
            DEFAULT: '#A855F7', // purple fintech (acciones)
            lighter: '#C084FC',
            dark: '#9333EA',
          },
          dark: {
            DEFAULT: '#C084FC',
            lighter: '#E9D5FF',
            dark: '#A855F7',
          },
        },

        success: {
          light: {
            DEFAULT: '#16A34A', // verde dinero más serio
            lighter: '#22C55E',
            dark: '#15803D',
          },
          dark: {
            DEFAULT: '#22C55E',
            lighter: '#4ADE80',
            dark: '#16A34A',
          },
        },

        warning: {
          light: {
            DEFAULT: '#F59E0B', // amber más usable
            lighter: '#FBBF24',
            dark: '#D97706',
          },
          dark: {
            DEFAULT: '#FBBF24',
            lighter: '#FDE68A',
            dark: '#F59E0B',
          },
        },

        error: {
          light: {
            DEFAULT: '#E11D48', // rojo más moderno (rose)
            lighter: '#FB7185',
            dark: '#BE123C',
          },
          dark: {
            DEFAULT: '#FB7185',
            lighter: '#FDA4AF',
            dark: '#E11D48',
          },
        },

        neutral: {
          light: {
            DEFAULT: '#64748B', // slate mejor que gray
            lighter: '#94A3B8',
            dark: '#475569',
          },
          dark: {
            DEFAULT: '#475569',
            lighter: '#64748B',
            dark: '#334155',
          },
        },

        background: {
          light: {
            DEFAULT: '#F1F5F9', // más limpio tipo dashboard
            lighter: '#FFFFFF',
            dark: '#E2E8F0',
          },
          dark: {
            DEFAULT: '#020617', // deep dark fintech
            lighter: '#0B1220',
            dark: '#010409',
          },
        },

        gradient: {
          light: {
            from: '#3B82F6',
            to: '#0EA5E9',
          },
          dark: {
            from: '#1D4ED8',
            to: '#38BDF8',
          },
        },
      },
      container: {
        padding: {
          DEFAULT: '1rem',
          sm: '2rem',
          '2xl': '3rem',
        },
      },
      keyframes: {
        shimmer: {
          '100%': {
            transform: 'translateX(100%)',
          },
        },
      },
    },
  },
  plugins: [
    flyonui,
    flyonuiJs,
    function ({ addUtilities }) {
      addUtilities({
        '.gradient-text': {
          'background-clip': 'text',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'text-shadow': '0 0 4px rgba(255, 255, 255, .1), 0 0 14px rgba(130, 168, 236, .2)',
        },
      })
    },
  ],
  flyonui: {
    themes: [
      {
        light: {
          primary: '#60A5FA',
          'primary-content': '#FFFFFF',
          secondary: '#EF4444',
          'secondary-content': '#FFFFFF',
          accent: '#FACC15',
          'accent-content': '#18181B',
          neutral: '#6B7280',
          'neutral-content': '#FFFFFF',
          'base-100': '#FFFFFF',
          'base-200': '#F4F4F5',
          'base-300': '#E5E7EB',
          'base-content': '#18181B',
          info: '#3B82F6',
          'info-content': '#FFFFFF',
          success: '#22C55E',
          'success-content': '#FFFFFF',
          warning: '#F97316',
          'warning-content': '#FFFFFF',
          error: '#DC2626',
          'error-content': '#FFFFFF',
        },
      },
      {
        dark: {
          primary: '#60A5FA',
          'primary-content': '#010811',
          secondary: '#F87171',
          'secondary-content': '#130201',
          accent: '#FDE047',
          'accent-content': '#1F2937',
          neutral: '#4B5563',
          'neutral-content': '#FFFFFF',
          'base-100': '#111827',
          'base-200': '#27272A',
          'base-300': '#18181B',
          'base-content': '#F9FAFB',
          info: '#60A5FA',
          'info-content': '#FFFFFF',
          success: '#4ADE80',
          'success-content': '#FFFFFF',
          warning: '#FB923C',
          'warning-content': '#FFFFFF',
          error: '#EF4444',
          'error-content': '#FFFFFF',
        },
      },
    ],
  },
}
