/**
 * Shared Tailwind preset for the MobileFix Pro customer web app and admin console.
 * Keep semantic tokens here so both frontends render the same design system.
 */
export const mobileshopPreset = {
  theme: {
    extend: {
      colors: {
        canvas: '#FFFFFF',
        surface: '#F7F7F8',
        raised: '#FFFFFF',
        ink: {
          DEFAULT: '#111111',
          muted: '#6B7280',
        },
        line: '#E5E5E7',
        accent: {
          DEFAULT: '#1A5CFF',
          hover: '#0F4AD9',
          soft: '#EDF2FF',
        },
        success: {
          DEFAULT: '#16A34A',
          soft: '#ECFDF5',
        },
        warning: {
          DEFAULT: '#F59E0B',
          soft: '#FFFBEB',
        },
        danger: {
          DEFAULT: '#DC2626',
          soft: '#FEF2F2',
        },
        info: {
          DEFAULT: '#0891B2',
          soft: '#ECFEFF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(17, 17, 17, 0.04), 0 8px 24px rgba(17, 17, 17, 0.04)',
      },
    },
  },
  plugins: [],
};

export default mobileshopPreset;
