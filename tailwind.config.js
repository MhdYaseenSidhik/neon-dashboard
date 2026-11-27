/** Tailwind theme reads CSS variable tokens from src/styles/tokens.css. No literal values here. */
const v = (n) => `var(--${n})`
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    colors: {
      transparent: 'transparent', current: 'currentColor',
      bg: v('color-bg'), surface: v('color-surface'), raised: v('color-raised'), sunken: v('color-sunken'),
      border: v('color-border'), 'border-strong': v('color-border-strong'),
      fg: v('color-fg'), muted: v('color-fg-muted'), subtle: v('color-fg-subtle'),
      accent: v('color-accent'), 'accent-fg': v('color-accent-fg'), 'accent-soft': v('color-accent-soft'),
      success: v('color-success'), warning: v('color-warning'), danger: v('color-danger'), info: v('color-info'),
      'success-soft': v('color-success-soft'), 'warning-soft': v('color-warning-soft'),
      'danger-soft': v('color-danger-soft'), 'info-soft': v('color-info-soft'),
    },
    fontFamily: { sans: v('font-sans'), mono: v('font-mono') },
    fontSize: {
      xs: [v('text-12'), v('leading-12')], sm: [v('text-14'), v('leading-14')], base: [v('text-16'), v('leading-16')],
      xl: [v('text-20'), v('leading-20')], '2xl': [v('text-24'), v('leading-24')], '3xl': [v('text-32'), v('leading-32')],
    },
    spacing: {
      0: '0', px: '1px', 1: v('space-1'), 2: v('space-2'), 3: v('space-3'), 4: v('space-4'), 5: v('space-5'),
      6: v('space-6'), 8: v('space-8'), 12: v('space-12'), 16: v('space-16'),
      'ctl-sm': v('ctl-32'), ctl: v('ctl-40'),
    },
    borderRadius: { none: '0', sm: v('radius-sm'), md: v('radius-md'), full: v('radius-full') },
    boxShadow: { none: 'none', 1: v('elev-1'), 2: v('elev-2'), 3: v('elev-3') },
    maxWidth: { page: v('page-max'), full: '100%', xs: v('measure-xs'), prose: v('measure') },
    extend: {
      transitionDuration: { DEFAULT: v('motion-duration') },
      transitionTimingFunction: { DEFAULT: v('motion-ease') },
      minHeight: { ctl: v('ctl-40'), 'ctl-sm': v('ctl-32') }, minWidth: { ctl: v('ctl-40') },
      height: { ctl: v('ctl-40'), 'ctl-sm': v('ctl-32'), chart: v('chart-h'), 'chart-sm': v('chart-h-sm') },
      width: { sidebar: v('sidebar-w') },
    },
  },
  plugins: [],
}
