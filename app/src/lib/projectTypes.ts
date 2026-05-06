import type { ProjectType } from '@/types/dashboard';

/** Single source of truth for project type → color mapping.
 *  Mirrors design/foundation/tokens.css `--type-*` tokens. */
export const TYPE_COLOR: Record<ProjectType, string> = {
  research:   '#c9918e',
  publishing: '#bfac7e',
  education:  '#c4a07a',
  product:    '#8aa8c9',
  design:     '#a593c2',
  data:       '#8bb89a',
  system:     '#94a0ad',
};

export const TYPE_LABEL: Record<ProjectType, string> = {
  research:   'RESEARCH',
  publishing: 'PUBLISHING',
  education:  'EDUCATION',
  product:    'PRODUCT',
  design:     'DESIGN',
  data:       'DATA',
  system:     'SYSTEM',
};

/** Warm-gray palette — for chart bars / lines */
export const WARM_GRAY = {
  100: '#ede7e0',
  300: '#c4b5a5',
  500: '#8c7765',
  700: '#5c4a3c',
  900: '#2d231b',
} as const;

/** Greyscale palette — for axes, neutral text in charts */
export const GREY = {
  100: '#f5f5f5',
  200: '#e5e5e5',
  300: '#d4d4d4',
  400: '#a3a3a3',
  500: '#737373',
  700: '#404040',
  900: '#1a1a1a',
  black: '#000000',
} as const;
