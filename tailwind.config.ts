import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // פלטה ראשית — מצב כהה אלגנטי
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        accent: 'hsl(var(--accent))',
        'accent-foreground': 'hsl(var(--accent-foreground))',
        // הדגשת הצבע — Creator Vibe (סגול → כתום)
        creator: {
          purple: '#A855F7',
          orange: '#F97316',
        },
      },
      backgroundImage: {
        // הגרדיאנט המסחרי של האפליקציה
        'creator-gradient': 'linear-gradient(135deg, #A855F7 0%, #F97316 100%)',
        'creator-gradient-soft':
          'linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(249,115,22,0.15) 100%)',
      },
      fontFamily: {
        // אנגלית
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        // עברית
        heebo: ['var(--font-heebo)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
