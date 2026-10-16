import type { Config } from 'tailwindcss';

/**
 * ARKVOLT design system.
 *
 * Constraint is the aesthetic: one accent, two greys deep, zero gradients,
 * zero rounded corners of consequence. Every value below is deliberate —
 * if a colour is not in this file it does not belong on the site.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        /* Surfaces — five steps, each ~4% apart. Depth comes from these,
           never from a shadow or a glow. */
        void: '#08090B',
        gunmetal: '#0D0E12',
        plate: '#14161B',
        raised: '#1A1D23',
        /* Lines */
        hairline: '#1E2128',
        'hairline-strong': '#2A2E37',
        /* Ink */
        chalk: '#F2F4F7',
        steel: '#9BA3AF',
        slate: '#6B7280',
        /* The single accent. Used on <3% of pixels, always as a signal. */
        volt: '#00D4FF',
        /* Status only — never decorative. */
        amber: '#FFB020',
        crimson: '#FF4D4D',
        jade: '#3DD68C',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Impact', 'sans-serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        /* Display scale — compressed, tightly tracked, huge. */
        'd-sm': ['clamp(2.25rem, 5vw, 3.25rem)', { lineHeight: '0.94', letterSpacing: '-0.02em' }],
        'd-md': ['clamp(2.75rem, 7vw, 5rem)', { lineHeight: '0.92', letterSpacing: '-0.025em' }],
        'd-lg': ['clamp(3.5rem, 10vw, 8rem)', { lineHeight: '0.88', letterSpacing: '-0.03em' }],
        'd-xl': ['clamp(4.5rem, 15vw, 13rem)', { lineHeight: '0.84', letterSpacing: '-0.035em' }],
      },
      letterSpacing: {
        technical: '0.16em',
      },
      borderRadius: {
        none: '0',
        sharp: '2px',
      },
      spacing: {
        gutter: 'clamp(1.25rem, 4vw, 4rem)',
      },
      maxWidth: {
        shell: '1480px',
        prose: '68ch',
      },
      transitionTimingFunction: {
        /* Mechanical, not bouncy. No spring physics on a hardware brand. */
        mechanical: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translate3d(0,0,0)' },
          '100%': { transform: 'translate3d(-50%,0,0)' },
        },
        'line-draw': {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        'signal-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.25' },
        },
        'scan-sweep': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(400%)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        marquee: 'marquee var(--marquee-duration, 44s) linear infinite',
        'line-draw': 'line-draw 2.4s cubic-bezier(0.2,0.8,0.2,1) forwards',
        'signal-pulse': 'signal-pulse 2.4s ease-in-out infinite',
        'scan-sweep': 'scan-sweep 3.2s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-up': 'fade-up 0.6s cubic-bezier(0.2,0.8,0.2,1) both',
      },
    },
  },
  plugins: [],
};

export default config;
