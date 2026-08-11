import React from 'react';
import { Text } from 'ink';
import { colors, glyphs } from '../theme.js';
import { fit, truncate, width as displayWidth } from '../text.js';
import { countProgress, taskState } from '../model.js';
import { Panel, ProgressBar, useScrollOffset } from './components.js';

const h = React.createElement;

// Read at render time, not module load: `--ascii` swaps the glyph set in place.
function markFor(state) {
  if (state === 'done') return { glyph: glyphs.done, color: colors.done };
  if (state === 'partial') return { glyph: glyphs.partial, color: colors.partial };
  return { glyph: glyphs.todo, color: undefined, dim: true };
}

function Row({ row, selected, focused, contentWidth }) {
  const background = selected && focused ? colors.highlightBg : undefined;
  const gutter = selected ? glyphs.cursor : ' ';
  const state = taskState(row.task);
  const mark = markFor(state);
  const isHeader = row.type === 'header';

  // Prefix keeps the checkbox column aligned: top-level marks sit flush left,
  // subtasks hang off a tree branch two columns in.
  const prefix =
    row.type === 'subtask' ? `  ${row.last ? glyphs.lastBranch : glyphs.branch} ` : '';

  let right = null;
  let rightWidth = 0;
  if (isHeader) {
    const { total, done } = countProgress([row.task]);
    const counts = `${done}/${total}`;
    const barSize = contentWidth > 46 ? 8 : 0;
    rightWidth = displayWidth(counts) + (barSize ? barSize + 1 : 0) + 2;
    right = h(
      Text,
      null,
      '  ',
      barSize ? h(React.Fragment, null, h(ProgressBar, { done, total, size: barSize }), ' ') : null,
      h(Text, { dimColor: true }, counts),
    );
  }

  const symbol = isHeader
    ? { glyph: row.collapsed ? glyphs.collapsed : glyphs.expanded, dim: true }
    : mark;

  const room = contentWidth - 1 - displayWidth(prefix) - 2 - rightWidth;
  const title = truncate(row.task.title ?? '(untitled)', Math.max(4, room));
  const filler = ' '.repeat(Math.max(0, room - displayWidth(title)));
  const done = state === 'done';

  return h(
    Text,
    { backgroundColor: background },
    h(Text, { color: colors.accent }, gutter),
    h(Text, { dimColor: true }, prefix),
    h(Text, { color: symbol.color, dimColor: symbol.dim }, symbol.glyph),
    ' ',
    h(
      Text,
      {
        bold: isHeader,
        color: isHeader && done ? colors.done : undefined,
        dimColor: done && !isHeader,
        strikethrough: done && !isHeader,
      },
      title,
    ),
    filler,
    right,
  );
}

function Placeholder({ list, contentWidth }) {
  if (!list) {
    return h(Text, { dimColor: true }, fit(`no list selected ${glyphs.bullet} press n to create one`, contentWidth));
  }
  if (list.error) {
    return h(
      Text,
      { color: colors.danger },
      fit(truncate(`invalid JSON: ${list.error}`, contentWidth), contentWidth),
    );
  }
  if (list.empty) {
    return h(Text, { dimColor: true }, fit('this folder has no .json file yet', contentWidth));
  }
  return h(Text, { dimColor: true }, fit(`no tasks yet ${glyphs.bullet} press a to add one`, contentWidth));
}

export default function TaskPane({ list, rows, cursor, focused, paneWidth, paneHeight }) {
  const contentWidth = paneWidth - 4;
  const bodyHeight = paneHeight - 3;
  const overflow = rows.length > bodyHeight;
  const listHeight = overflow ? bodyHeight - 1 : bodyHeight;
  const offset = useScrollOffset(cursor, rows.length, listHeight);
  const visible = rows.slice(offset, offset + listHeight);

  const { total, done } = countProgress(list?.tasks ?? []);
  const heading = list ? list.title : 'TASKS';
  const right = list && !list.error && !list.empty ? `${done}/${total}` : '';

  const above = offset;
  const below = Math.max(0, rows.length - offset - visible.length);

  return h(
    Panel,
    { title: heading.toUpperCase(), right, focused, paneWidth, paneHeight },
    rows.length === 0
      ? h(Placeholder, { list, contentWidth })
      : visible.map((row, i) =>
          h(Row, {
            key: row.path.join('.'),
            row,
            selected: offset + i === cursor,
            focused,
            contentWidth,
          }),
        ),
    overflow
      ? h(
          Text,
          { dimColor: true },
          fit(
            ` ${[above && `${glyphs.arrowUp} ${above} above`, below && `${glyphs.arrowDown} ${below} below`]
              .filter(Boolean)
              .join('   ')}`,
            contentWidth,
          ),
        )
      : null,
  );
}
