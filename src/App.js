import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { scanLists, saveList, watchLists } from './store.js';
import { flattenTasks, togglableRowIndices, toggleRow, countProgress } from './model.js';

const h = React.createElement;

function SidebarItem({ list, selected }) {
  const { total, done } = countProgress(list.tasks);
  const marker = selected ? '> ' : '  ';
  const flag = list.error ? ' !' : list.empty ? ' (no json)' : '';
  const label = `${marker}${list.title}${flag} (${done}/${total})`;
  return h(Text, { inverse: selected, color: list.error ? 'red' : undefined }, label);
}

function RowLine({ row, selected }) {
  if (row.type === 'header') {
    const total = row.task.subtasks.length;
    const done = row.task.subtasks.filter((s) => s.done).length;
    return h(Text, { bold: true }, `    ${row.task.title}  (${done}/${total})`);
  }
  const indent = row.type === 'subtask' ? '      ' : '  ';
  const marker = selected ? '>' : ' ';
  const box = row.task.done ? '[x]' : '[ ]';
  const text = `${marker} ${indent}${box} ${row.task.title}`;
  return h(Text, { inverse: selected, color: !selected && row.task.done ? 'green' : undefined }, text);
}

export default function App({ rootDir }) {
  const { exit } = useApp();
  const [lists, setLists] = useState(() => scanLists(rootDir));
  const [listIndex, setListIndex] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const stop = watchLists(rootDir, () => setLists(scanLists(rootDir)));
    return stop;
  }, [rootDir]);

  const safeListIndex = lists.length ? Math.min(listIndex, lists.length - 1) : 0;
  const activeList = lists[safeListIndex];
  const rows = useMemo(() => (activeList ? flattenTasks(activeList.tasks) : []), [activeList]);
  const togglableIdx = useMemo(() => togglableRowIndices(rows), [rows]);
  const safeCursor = togglableIdx.length ? Math.min(cursor, togglableIdx.length - 1) : 0;
  const selectedRowIndex = togglableIdx.length ? togglableIdx[safeCursor] : -1;

  useInput((input, key) => {
    if (input === 'q' || key.escape) {
      exit();
      return;
    }
    if (key.tab) {
      const dir = key.shift ? -1 : 1;
      setListIndex((i) => (lists.length ? (i + dir + lists.length) % lists.length : 0));
      setCursor(0);
      setMessage('');
      return;
    }
    if (key.leftArrow) {
      setListIndex((i) => Math.max(0, i - 1));
      setCursor(0);
      setMessage('');
      return;
    }
    if (key.rightArrow) {
      setListIndex((i) => Math.min(Math.max(0, lists.length - 1), i + 1));
      setCursor(0);
      setMessage('');
      return;
    }
    if (key.upArrow || input === 'k') {
      setCursor((c) => Math.max(0, c - 1));
      return;
    }
    if (key.downArrow || input === 'j') {
      setCursor((c) => Math.min(Math.max(0, togglableIdx.length - 1), c + 1));
      return;
    }
    if (input === 'r') {
      setLists(scanLists(rootDir));
      setMessage('Rescanned');
      return;
    }
    if (key.return || input === ' ') {
      if (!activeList || selectedRowIndex < 0) return;
      const row = rows[selectedRowIndex];
      const nextTasks = toggleRow(activeList.tasks, row);
      saveList(activeList, nextTasks);
      setLists((ls) => ls.map((l, i) => (i === safeListIndex ? { ...l, tasks: nextTasks } : l)));
      setMessage('');
    }
  });

  return h(
    Box,
    { flexDirection: 'column' },
    h(
      Box,
      null,
      h(Text, { bold: true, color: 'cyan' }, 'todo-tui'),
      h(Text, { dimColor: true }, `  watching ${rootDir}`)
    ),
    h(
      Box,
      { flexDirection: 'row', marginTop: 1 },
      h(
        Box,
        { flexDirection: 'column', width: 32, marginRight: 2 },
        lists.length === 0
          ? h(Text, { dimColor: true }, '(no lists yet)')
          : lists.map((l, i) => h(SidebarItem, { key: l.id, list: l, selected: i === safeListIndex }))
      ),
      h(
        Box,
        { flexDirection: 'column', flexGrow: 1 },
        !activeList
          ? h(Text, { dimColor: true }, 'Create a folder with a .json file in it to see it here.')
          : activeList.error
            ? h(Text, { color: 'red' }, `Invalid JSON in ${activeList.id}: ${activeList.error}`)
            : activeList.empty
              ? h(Text, { dimColor: true }, `No .json file found in ${activeList.id} yet.`)
              : rows.length === 0
                ? h(Text, { dimColor: true }, '(empty list)')
                : rows.map((row, i) => h(RowLine, { key: i, row, selected: i === selectedRowIndex }))
      )
    ),
    h(Box, { marginTop: 1 }, h(Text, { dimColor: true }, '↑/↓ or j/k move   ←/→ or Tab switch list   space/enter toggle   r refresh   q quit')),
    message ? h(Box, null, h(Text, { color: 'yellow' }, message)) : null
  );
}
