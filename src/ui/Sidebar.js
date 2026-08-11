import React from 'react';
import { Box, Text } from 'ink';
import { colors, glyphs } from '../theme.js';
import { fit, truncate, width as displayWidth } from '../text.js';
import { countProgress } from '../model.js';
import { Panel, ProgressBar, useScrollOffset } from './components.js';

const h = React.createElement;

function listTone(list, total, done) {
  if (list.error) return { dot: '!', color: colors.danger };
  if (total === 0) return { dot: glyphs.todo, color: undefined, dim: true };
  if (done === total) return { dot: glyphs.done, color: colors.done };
  if (done > 0) return { dot: glyphs.partial, color: colors.partial };
  return { dot: glyphs.todo, color: undefined };
}

function ListRow({ list, selected, focused, contentWidth, dense }) {
  const { total, done } = countProgress(list.tasks);
  const tone = listTone(list, total, done);
  const counts = list.error ? 'error' : list.empty ? 'no json' : `${done}/${total}`;
  const background = selected ? (focused ? colors.highlightBg : undefined) : undefined;
  const gutter = selected ? glyphs.cursor : ' ';

  const titleRoom = dense ? contentWidth - 3 - displayWidth(counts) - 1 : contentWidth - 3;
  const title = truncate(list.title, Math.max(4, titleRoom));

  const head = h(
    Text,
    { backgroundColor: background, bold: selected },
    h(Text, { color: colors.accent }, gutter),
    h(Text, { color: tone.color, dimColor: tone.dim }, tone.dot),
    ' ',
    h(Text, { dimColor: !selected && total > 0 && done === total }, title),
    dense
      ? h(
          Text,
          { dimColor: true },
          ' '.repeat(Math.max(1, contentWidth - 3 - displayWidth(title) - displayWidth(counts))),
          counts,
        )
      : ' '.repeat(Math.max(0, contentWidth - 3 - displayWidth(title))),
  );

  if (dense) return head;

  const barSize = Math.max(4, Math.min(14, contentWidth - 5 - displayWidth(counts)));
  const tail = h(
    Text,
    { backgroundColor: background },
    ' '.repeat(3),
    list.error || list.empty
      ? h(Text, { dimColor: true }, fit(counts, Math.max(0, contentWidth - 3)))
      : h(
          Text,
          null,
          h(ProgressBar, { done, total, size: barSize }),
          h(Text, { dimColor: true }, `  ${counts}`),
          ' '.repeat(
            Math.max(0, contentWidth - 3 - barSize - 2 - displayWidth(counts)),
          ),
        ),
  );

  return h(Box, { flexDirection: 'column' }, head, tail);
}

export default function Sidebar({ lists, selectedIndex, focused, paneWidth, paneHeight }) {
  const contentWidth = paneWidth - 4;
  const rowsHeight = paneHeight - 3;

  // Two lines per list reads much better, but fall back to one line each when
  // there are more lists than that would fit.
  const dense = lists.length * 2 > rowsHeight;
  const perItem = dense ? 1 : 2;
  const capacity = Math.max(1, Math.floor(rowsHeight / perItem));
  const offset = useScrollOffset(selectedIndex, lists.length, capacity);
  const visible = lists.slice(offset, offset + capacity);
  const scrolled = lists.length > capacity;

  return h(
    Panel,
    {
      title: 'LISTS',
      right: scrolled ? `${offset + 1}-${offset + visible.length}/${lists.length}` : '',
      focused,
      paneWidth,
      paneHeight,
    },
    lists.length === 0
      ? h(Text, { dimColor: true }, fit('no lists yet', contentWidth))
      : visible.map((list, i) =>
          h(ListRow, {
            key: list.filePath ?? list.id,
            list,
            selected: offset + i === selectedIndex,
            focused,
            contentWidth,
            dense,
          }),
        ),
  );
}
