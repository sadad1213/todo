import React, { useRef } from 'react';
import { Box, Text } from 'ink';
import { colors, glyphs } from '../theme.js';
import { fit, truncate, width as displayWidth } from '../text.js';

const h = React.createElement;

export function ProgressBar({ done, total, size = 10 }) {
  const ratio = total > 0 ? done / total : 0;
  const filled = total > 0 ? Math.max(ratio > 0 ? 1 : 0, Math.round(size * ratio)) : 0;
  const complete = total > 0 && done === total;
  return h(
    Text,
    null,
    h(Text, { color: complete ? colors.done : colors.accent }, glyphs.barFull.repeat(filled)),
    h(Text, { dimColor: true }, glyphs.barEmpty.repeat(Math.max(0, size - filled))),
  );
}

// A bordered pane with its own heading row. Ink has no border titles, so the
// heading is just the first line of the content.
export function Panel({ title, right = '', focused, paneWidth, paneHeight, children }) {
  const inner = paneWidth - 4;
  const rightText = right ? truncate(right, Math.max(0, inner - 6)) : '';
  const titleText = truncate(title, Math.max(0, inner - displayWidth(rightText) - 1));
  const gap = Math.max(1, inner - displayWidth(titleText) - displayWidth(rightText));

  return h(
    Box,
    {
      flexDirection: 'column',
      width: paneWidth,
      height: paneHeight,
      borderStyle: glyphs.border,
      borderColor: focused ? colors.accent : undefined,
      borderDimColor: !focused,
      paddingX: 1,
      flexShrink: 0,
    },
    h(
      Text,
      null,
      h(Text, { bold: true, color: focused ? colors.accent : undefined, dimColor: !focused }, titleText),
      ' '.repeat(gap),
      h(Text, { dimColor: true }, rightText),
    ),
    children,
  );
}

// Renders "N more above/below" markers around a scrolled window.
export function ScrollHint({ count, direction, contentWidth }) {
  if (count <= 0) return null;
  const arrow = direction === 'up' ? glyphs.arrowUp : glyphs.arrowDown;
  return h(Text, { dimColor: true }, fit(` ${arrow} ${count} more`, contentWidth));
}

// Keeps `cursor` visible inside a window of `height` rows without snapping the
// view around: the offset only moves when the cursor would leave it.
export function useScrollOffset(cursor, total, height) {
  const ref = useRef(0);
  let offset = ref.current;

  if (height >= total || height <= 0) {
    offset = 0;
  } else {
    if (cursor < offset) offset = cursor;
    if (cursor > offset + height - 1) offset = cursor - height + 1;
    offset = Math.max(0, Math.min(offset, total - height));
  }

  ref.current = offset;
  return offset;
}
