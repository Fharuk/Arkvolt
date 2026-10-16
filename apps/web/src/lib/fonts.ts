import localFont from 'next/font/local';

/**
 * Self-hosted, subset to latin + latin-ext, weights limited to what the
 * design actually uses. No runtime request to Google, no layout shift, and
 * the site renders identically offline. Total payload: ~266 KB for all three
 * families across both subsets.
 */

export const display = localFont({
  src: [
    { path: '../../public/fonts/barlow-condensed-500-latin.woff2', weight: '500', style: 'normal' },
    { path: '../../public/fonts/barlow-condensed-600-latin.woff2', weight: '600', style: 'normal' },
    { path: '../../public/fonts/barlow-condensed-700-latin.woff2', weight: '700', style: 'normal' },
    { path: '../../public/fonts/barlow-condensed-500-latin-ext.woff2', weight: '500', style: 'normal' },
    { path: '../../public/fonts/barlow-condensed-600-latin-ext.woff2', weight: '600', style: 'normal' },
    { path: '../../public/fonts/barlow-condensed-700-latin-ext.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-display',
  display: 'swap',
  fallback: ['Impact', 'Haettenschweiler', 'Arial Narrow', 'sans-serif'],
  preload: true,
  adjustFontFallback: false,
});

export const body = localFont({
  src: [
    { path: '../../public/fonts/dm-sans-400-latin.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/dm-sans-500-latin.woff2', weight: '500', style: 'normal' },
    { path: '../../public/fonts/dm-sans-700-latin.woff2', weight: '700', style: 'normal' },
    { path: '../../public/fonts/dm-sans-400-latin-ext.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/dm-sans-500-latin-ext.woff2', weight: '500', style: 'normal' },
    { path: '../../public/fonts/dm-sans-700-latin-ext.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-body',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
  preload: true,
  adjustFontFallback: false,
});

export const mono = localFont({
  src: [
    { path: '../../public/fonts/jetbrains-mono-400-latin.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/jetbrains-mono-500-latin.woff2', weight: '500', style: 'normal' },
    { path: '../../public/fonts/jetbrains-mono-400-latin-ext.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/jetbrains-mono-500-latin-ext.woff2', weight: '500', style: 'normal' },
  ],
  variable: '--font-mono',
  display: 'swap',
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
  preload: true,
  adjustFontFallback: false,
});

export const fontVars = `${display.variable} ${body.variable} ${mono.variable}`;
