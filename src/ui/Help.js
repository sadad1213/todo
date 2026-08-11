import React from 'react';
import { Box, Text } from 'ink';
import { colors } from '../theme.js';
import { pad } from '../text.js';
import { Panel } from './components.js';

const h = React.createElement;

const LEFT = [
  ['NAVIGATION', null],
  ['up / down', 'move (also k / j)'],
  ['left / right', 'switch pane'],
  ['tab', 'switch pane'],
  ['g / G', 'first / last task'],
  ['pgup / pgdn', 'page up / down'],
  ['', ''],
  ['LISTS', null],
  ['n', 'new list'],
  ['R', 'rename list'],
  ['X', 'delete list'],
  ['', ''],
  ['APP', null],
  ['r', 'rescan from disk'],
  ['?', 'toggle this help'],
  ['q', 'quit'],
];

const RIGHT = [
  ['TASKS', null],
  ['space', 'toggle done'],
  ['enter', 'toggle, or fold a group'],
  ['a', 'add task'],
  ['s', 'add subtask'],
  ['e', 'rename task'],
  ['d', 'delete task'],
  ['K / J', 'move up / down'],
  ['z', 'fold / unfold all groups'],
  ['', ''],
  ['NOTES', null],
  ['', 'toggling a group sets all'],
  ['', 'of its subtasks at once'],
  ['', ''],
  ['', 'edits are written to the'],
  ['', 'list JSON immediately'],
];

function Column({ entries, keyWidth, colWidth }) {
  return h(
    Box,
    { flexDirection: 'column', width: colWidth },
    entries.map(([key, description], i) => {
      if (description === null) {
        return h(Text, { key: i, bold: true, color: colors.accent }, key);
      }
      if (!key && !description) return h(Text, { key: i }, ' ');
      return h(
        Text,
        { key: i },
        h(Text, { color: key ? colors.partial : undefined }, pad(key, keyWidth)),
        h(Text, { dimColor: true }, description),
      );
    }),
  );
}

export default function Help({ paneWidth, paneHeight }) {
  const inner = paneWidth - 4;
  const colWidth = Math.floor(inner / 2);
  const keyWidth = 14;

  return h(
    Panel,
    { title: 'KEYS', right: '? to close', focused: true, paneWidth, paneHeight },
    h(
      Box,
      { flexDirection: 'row' },
      h(Column, { entries: LEFT, keyWidth, colWidth }),
      h(Column, { entries: RIGHT, keyWidth, colWidth: inner - colWidth }),
    ),
  );
}
