// Glyphs and colours used across the UI.
//
// Everything visual lives here so the whole look can be retuned in one place.
// The glyph set is mutated in place by `useAsciiGlyphs()` (called once from the
// CLI, before rendering) so components can just import `glyphs` and read fields.

const UNICODE = {
  logo: '▍',
  done: '✔',
  todo: '○',
  partial: '◐',
  expanded: '▾',
  collapsed: '▸',
  branch: '├',
  lastBranch: '└',
  bullet: '•',
  cursor: '▌',
  barFull: '━',
  barEmpty: '─',
  more: '·',
  ellipsis: '…',
  arrowUp: '↑',
  arrowDown: '↓',
  border: 'round',
};

const ASCII = {
  logo: '|',
  done: 'x',
  todo: '-',
  partial: '~',
  expanded: 'v',
  collapsed: '>',
  branch: '|',
  lastBranch: '`',
  bullet: '*',
  cursor: '>',
  barFull: '=',
  barEmpty: '.',
  more: '.',
  ellipsis: '..',
  arrowUp: '^',
  arrowDown: 'v',
  border: 'classic',
};

export const glyphs = { ...UNICODE };

export function useAsciiGlyphs(enabled) {
  Object.assign(glyphs, enabled ? ASCII : UNICODE);
}

// Accents are hex so they look the same everywhere chalk can do truecolor, and
// degrade to the nearest ANSI colour where it can't. Muted text uses `dimColor`
// instead of a fixed grey so it stays readable on light backgrounds too.
export const colors = {
  accent: '#7dcfff',
  accentDeep: '#3d59a1',
  done: '#9ece6a',
  partial: '#e0af68',
  danger: '#f7768e',
  highlightBg: '#2b3f5c',
  headerBg: '#1f2335',
};
