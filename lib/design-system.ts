export const tokens = {
  spacing: {
    0: '0rem',
    px: '1px',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
  },
  radius: {
    none: '0rem',
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  },
  shadow: {
    none: '0 0 #0000',
    sm: '0 1px 2px 0 hsl(0 0% 0% / 0.05)',
    md: '0 10px 30px -15px hsl(0 0% 0% / 0.22)',
    lg: '0 24px 60px -24px hsl(0 0% 0% / 0.28)',
  },
  zIndex: {
    base: 0,
    sidebar: 20,
    header: 30,
    overlay: 40,
    dialog: 50,
    popover: 60,
    toast: 70,
  },
} as const;

export const semanticColors = {
  background: 'hsl(var(--background))',
  surface: 'hsl(var(--surface))',
  surfaceRaised: 'hsl(var(--surface-raised))',
  border: 'hsl(var(--border))',
  borderStrong: 'hsl(var(--border-strong))',
  textPrimary: 'hsl(var(--text-primary))',
  textSecondary: 'hsl(var(--text-secondary))',
  textTertiary: 'hsl(var(--text-tertiary))',
  accent: 'hsl(var(--accent))',
  accentForeground: 'hsl(var(--accent-foreground))',
} as const;

export const statusColorMap = {
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300',
  warning:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300',
  error:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/15 dark:text-red-300',
  info:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/15 dark:text-blue-300',
} as const;

export const typographyScale = {
  xs: { fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 500 },
  sm: { fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 500 },
  base: { fontSize: '0.875rem', lineHeight: '1.5rem', fontWeight: 400 },
  lg: { fontSize: '1rem', lineHeight: '1.5rem', fontWeight: 600 },
  xl: { fontSize: '1.25rem', lineHeight: '1.75rem', fontWeight: 600 },
  '2xl': { fontSize: '1.5rem', lineHeight: '2rem', fontWeight: 600 },
} as const;

export const productStatusColorMap: Record<string, string> = {
  'In Progress': statusColorMap.warning,
  Completed: statusColorMap.success,
  'In Progress - High priority': statusColorMap.error,
  'On hold':
    'border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--text-secondary))]',
  Ignored:
    'border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--text-tertiary))]',
};

export function getProductStatusClasses(status: string | null | undefined) {
  if (!status) return '';
  return productStatusColorMap[status] ?? 'border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--text-secondary))]';
}
