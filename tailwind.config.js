/** @type {import('tailwindcss').Config} */
import flyonui from 'flyonui'
import flyonuiJs from 'flyonui/plugin'
import defaultTheme from 'tailwindcss/defaultTheme'

export default {
  darkMode: ['class'],
  content: ['./src/**/*.{vue,js,ts,jsx,tsx}', './node_modules/flyonui/dist/js/*.js'],
  theme: {
    fontFamily: {
      sans: ['"Plus Jakarta Sans"', ...defaultTheme.fontFamily.sans],
      display: ['Syne', '"Plus Jakarta Sans"', ...defaultTheme.fontFamily.sans],
    },
    extend: {
      fontSize: {
        '3.5xl': ['2rem', { lineHeight: '38px' }],
      },
      colors: {
        // Tribo design tokens (matching tribo-tokens.jsx)
        tribo: {
          verde:        '#1B4332',
          'verde-deep': '#13301F',
          'verde-mid':  '#2D6A4F',
          'verde-soft': '#3D8B65',
          'verde-tint': '#E6EFE9',
          amber:        '#E8920A',
          'amber-light':'#F5B942',
          'amber-soft': '#FCEBC4',
          crema:        '#F7F4EF',
          'crema-deep': '#EFEAE0',
          ink:          '#0F1B14',
          'ink-70':     '#3A4A41',
          'ink-50':     '#6B7A72',
          'ink-30':     '#A8B3AC',
          'ink-15':     '#D8DDD7',
          'ink-08':     '#ECEFEB',
        },

        brand: {
          primary: {
            light: { DEFAULT: '#1B4332', lighter: '#2D6A4F', dark: '#13301F' },
            dark:  { DEFAULT: '#2D6A4F', lighter: '#3D8B65', dark: '#1B4332' },
          },
          secondary: {
            light: { DEFAULT: '#E8920A', lighter: '#F5B942', dark: '#C97208' },
            dark:  { DEFAULT: '#F5B942', lighter: '#FCEBC4', dark: '#E8920A' },
          },
        },

        background: {
          light: { DEFAULT: '#F7F4EF', lighter: '#FFFFFF', dark: '#EFEAE0' },
          dark:  { DEFAULT: '#0F1B14', lighter: '#13301F', dark: '#0A1510' },
        },

        default: {
          light: { DEFAULT: '#FFFFFF', lighter: '#F7F4EF', dark: '#EFEAE0' },
          dark:  { DEFAULT: '#13301F', lighter: '#1B4332', dark: '#0A1510' },
        },

        success: {
          light: { DEFAULT: '#16A34A', lighter: '#22C55E', dark: '#15803D' },
          dark:  { DEFAULT: '#22C55E', lighter: '#4ADE80', dark: '#16A34A' },
        },

        warning: {
          light: { DEFAULT: '#E8920A', lighter: '#F5B942', dark: '#C97208' },
          dark:  { DEFAULT: '#F5B942', lighter: '#FCEBC4', dark: '#E8920A' },
        },

        error: {
          light: { DEFAULT: '#DC2626', lighter: '#F87171', dark: '#B91C1C' },
          dark:  { DEFAULT: '#F87171', lighter: '#FCA5A5', dark: '#DC2626' },
        },

        neutral: {
          light: { DEFAULT: '#6B7A72', lighter: '#A8B3AC', dark: '#3A4A41' },
          dark:  { DEFAULT: '#3A4A41', lighter: '#6B7A72', dark: '#0F1B14' },
        },

        accent: {
          light: { DEFAULT: '#8B5CF6', lighter: '#A78BFA', dark: '#7C3AED' },
          dark:  { DEFAULT: '#A78BFA', lighter: '#C4B5FD', dark: '#8B5CF6' },
        },

        gradient: {
          light: { from: '#1B4332', to: '#E8920A' },
          dark:  { from: '#13301F', to: '#C97208' },
        },
      },
      container: {
        padding: { DEFAULT: '1rem', sm: '2rem', '2xl': '3rem' },
      },
      borderRadius: {
        card: '14px',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
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
        },
      })
    },
  ],
  flyonui: {
    themes: [
      {
        light: {
          primary: '#1B4332',
          'primary-content': '#F7F4EF',
          secondary: '#E8920A',
          'secondary-content': '#13301F',
          accent: '#E8920A',
          'accent-content': '#13301F',
          neutral: '#6B7A72',
          'neutral-content': '#FFFFFF',
          'base-100': '#F7F4EF',
          'base-200': '#EFEAE0',
          'base-300': '#D8DDD7',
          'base-content': '#0F1B14',
          info: '#2D6A4F',
          'info-content': '#FFFFFF',
          success: '#16A34A',
          'success-content': '#FFFFFF',
          warning: '#E8920A',
          'warning-content': '#FFFFFF',
          error: '#DC2626',
          'error-content': '#FFFFFF',
        },
      },
      {
        dark: {
          primary: '#2D6A4F',
          'primary-content': '#F7F4EF',
          secondary: '#F5B942',
          'secondary-content': '#13301F',
          accent: '#F5B942',
          'accent-content': '#13301F',
          neutral: '#3A4A41',
          'neutral-content': '#FFFFFF',
          'base-100': '#0F1B14',
          'base-200': '#13301F',
          'base-300': '#1B4332',
          'base-content': '#F7F4EF',
          info: '#3D8B65',
          'info-content': '#FFFFFF',
          success: '#22C55E',
          'success-content': '#FFFFFF',
          warning: '#F5B942',
          'warning-content': '#13301F',
          error: '#EF4444',
          'error-content': '#FFFFFF',
        },
      },
    ],
  },
}
