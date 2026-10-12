/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Field & Play tokens
        surface: '#fcfdfe',
        'surface-dim': '#dfd9d2',
        'surface-bright': '#ffffff',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f2f6f9',
        'surface-container': '#eaf0f5',
        'surface-container-high': '#e2eaf1',
        'surface-container-highest': '#d9e4ed',
        'surface-variant': '#e2eaf1',
        'on-surface': '#1d1b17',
        'on-surface-variant': '#44525e',
        'on-background': '#1d1b17',
        'inverse-surface': '#32302c',
        'inverse-on-surface': '#f6f0e9',
        outline: '#7c8b99',
        'outline-variant': '#d3dde6',
        'surface-tint': '#4a6f8f',
        // Steel blue from the club logo, darkened from #5b84a8 so it reaches
        // 5.30:1 against white both ways. At #5b84a8 the wordmark, every body
        // link, the eyebrow labels and the announcement bar sat at 3.95:1 and
        // failed WCAG AA for normal text. Verified by measurement, not by eye.
        primary: '#4a6f8f',
        'on-primary': '#ffffff',
        'primary-container': '#cfe1f0',
        'on-primary-container': '#15344d',
        'inverse-primary': '#a9c6de',
        'primary-fixed': '#cfe1f0',
        'primary-fixed-dim': '#a9c6de',
        'on-primary-fixed': '#0f2a40',
        'on-primary-fixed-variant': '#274a68',
        secondary: '#705d00',
        'on-secondary': '#ffffff',
        'secondary-container': '#fcd400',
        'on-secondary-container': '#6e5c00',
        'secondary-fixed': '#ffe16d',
        'secondary-fixed-dim': '#e9c400',
        'on-secondary-fixed': '#221b00',
        'on-secondary-fixed-variant': '#544600',
        tertiary: '#006a63',
        'on-tertiary': '#ffffff',
        'tertiary-container': '#29b6ab',
        'on-tertiary-container': '#00423d',
        'tertiary-fixed': '#79f7ea',
        'tertiary-fixed-dim': '#5adace',
        'on-tertiary-fixed': '#00201d',
        'on-tertiary-fixed-variant': '#00504a',
        error: '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',
        // Accent: the club's track red (#b04f49) for CTAs, active states and
        // motion highlights. White text on it is 5.17:1 (AA); navy would be only
        // 3.2:1, so buttons use signal-ink (white). As text it passes on white
        // (5.17:1) and cream (4.67:1); on navy it is 3.2:1 — fine for large
        // display type and graphics, but small red text on navy uses signal-light.
        signal: '#b04f49',
        // Track red lifted for small text on navy/dark sections (5.65:1 on ink).
        'signal-light': '#d87e78',
        'sunflower-caution': '#ffd700',
        'on-sunflower': '#7a6500',
        'mint-go': '#4fd1c5',
        'sky-info': '#0ea5e9',
        // Darker text tones for use on tinted (15–20% alpha) backgrounds
        // The darker track red for text on light and red-tinted backgrounds
        // (7.47:1 on white, 6.1:1 on a 15% red tint).
        'on-signal': '#893e39',
        // Text sitting ON the red fill: white, 5.17:1 (navy would be 3.2:1).
        'signal-ink': '#ffffff',
        'on-sky': '#0b5a7a',
        'on-mint': '#00534b',
        // Hover darkens, so white button text gets more contrast, not less (6.28:1).
        'signal-hover': '#9b4640',
        // Near-black cell for logos that are white artwork on black (Cheal)
        'sponsor-dark': '#111315',
        'surface-cream': '#f7fafc',
        'text-ink': '#1a202c',

        // Glow-up palette (Sixes-inspired, athletics flavoured): deep navy
        // "night track" ink, cream paper, terracotta running-track lanes.
        ink: { DEFAULT: '#0c2033', 2: '#12304b', 3: '#1b4466' },
        // Warm off-white paper and the club's track red (the real track colour).
        cream: { DEFAULT: '#F6F3EC', 2: '#ece6d8' },
        track: { DEFAULT: '#b04f49', dark: '#893e39' },
        sky: { soft: '#a9c6de', DEFAULT: '#7fa6cc' },

        // shadcn-style semantic aliases
        background: '#fcfdfe',
        foreground: '#1a202c',
        card: '#ffffff',
        'card-foreground': '#1a202c',
        popover: '#ffffff',
        'popover-foreground': '#1a202c',
        muted: '#f2f6f9',
        'muted-foreground': '#44525e',
        accent: '#4fd1c5',
        'accent-foreground': '#00423d',
        destructive: '#ba1a1a',
        'destructive-foreground': '#ffffff',
        border: '#d3dde6',
        input: '#d3dde6',
        ring: '#4a6f8f',
      },
      fontSize: {
        // 14px floor. The old 12px secondary text was too small to read
        // outdoors on a phone. This has to be done on the scale: a `.text-xs`
        // rule in @layer base loses the cascade to Tailwind's utility layer.
        xs: ['0.875rem', { lineHeight: '1.25rem' }],
        sm: ['0.9375rem', { lineHeight: '1.375rem' }],
        base: ['1rem', { lineHeight: '1.6' }],
      },
      fontFamily: {
        // 'Variable' suffixes match the @fontsource-variable packages.
        // NOTE: do not go back to Fraunces — it has no ō glyph (see index.css).
        sans: ['Inter Variable', 'Inter', 'system-ui', 'sans-serif'],
        // Heavy condensed sports face. Barlow Condensed draws a real ō (U+014D)
        // in its latin-ext subset — checked against "Taupō" in a screenshot.
        display: ['Barlow Condensed', 'Arial Narrow', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
        '2xl': '2rem',
        '3xl': '2.5rem',
        full: '9999px',
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(0, 0, 0, 0.08), 0 2px 8px -2px rgba(0, 0, 0, 0.04)',
        'soft-sm': '0 2px 8px rgba(0, 0, 0, 0.06)',
        floating: '0 12px 32px rgba(29, 27, 23, 0.10)',
        signal: '0 4px 0 #652d2a',
        'signal-sm': '0 3px 0 #652d2a',
      },
      spacing: {
        base: '8px',
        'gutter-sm': '16px',
        'gutter-md': '24px',
        'margin-mobile': '16px',
        'margin-desktop': '48px',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        'register-pulse': {
          '0%, 70%, 100%': { boxShadow: '0 3px 0 #652d2a, 0 0 0 0 rgba(176,79,73,0.55)' },
          '35%': { boxShadow: '0 3px 0 #652d2a, 0 0 0 10px rgba(176,79,73,0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.5s ease both',
        'register-pulse': 'register-pulse 2.8s ease-in-out infinite',
        marquee: 'marquee 38s linear infinite',
        'marquee-fast': 'marquee 22s linear infinite',
        'spin-slow': 'spin-slow 18s linear infinite',
      },
    },
  },
  plugins: [],
}
