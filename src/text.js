// Small string helpers for laying out fixed-width terminal rows.

import stringWidth from 'string-width';
import { glyphs } from './theme.js';

export function width(str) {
  return stringWidth(String(str ?? ''));
}

// Cuts `str` down to `max` columns, appending an ellipsis when it had to cut.
export function truncate(str, max) {
  const s = String(str ?? '');
  if (max <= 0) return '';
  if (width(s) <= max) return s;

  const suffix = glyphs.ellipsis;
  const budget = Math.max(0, max - width(suffix));
  let out = '';
  for (const ch of s) {
    if (width(out + ch) > budget) break;
    out += ch;
  }
  return out + suffix;
}

// Keeps the *end* of the string — the useful half of a long file path.
export function truncateStart(str, max) {
  const s = String(str ?? '');
  if (max <= 0) return '';
  if (width(s) <= max) return s;

  const prefix = glyphs.ellipsis;
  const budget = Math.max(0, max - width(prefix));
  const chars = [...s];
  let out = '';
  for (let i = chars.length - 1; i >= 0; i -= 1) {
    if (width(chars[i] + out) > budget) break;
    out = chars[i] + out;
  }
  return prefix + out;
}

export function pad(str, target) {
  const gap = target - width(str);
  return gap > 0 ? str + ' '.repeat(gap) : str;
}

// Truncate *and* pad, so a row always occupies exactly `target` columns —
// which is what makes a full-width selection highlight look like a solid bar.
export function fit(str, target) {
  return pad(truncate(str, target), target);
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
