import path from 'node:path';
import React, { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { colors, glyphs } from '../theme.js';
import { truncateStart } from '../text.js';
import { TODO_DIR_NAME, expandPath, rememberRoot } from '../config.js';
import { createList, ensureDir } from '../store.js';
import TextInput from './TextInput.js';

const h = React.createElement;

function Option({ label, hint, selected, contentWidth }) {
  return h(
    Box,
    { flexDirection: 'column' },
    h(
      Text,
      { bold: selected },
      h(Text, { color: colors.accent }, selected ? `${glyphs.cursor} ` : '  '),
      h(Text, { color: selected ? colors.accent : undefined }, selected ? glyphs.partial : glyphs.todo),
      ' ',
      label,
    ),
    h(Text, { dimColor: true }, `    ${truncateStart(hint, Math.max(10, contentWidth - 4))}`),
  );
}

// Shown when `todo` is launched somewhere with no `.todo` folder and no saved
// mapping. Nothing is written to disk until the user picks something.
export default function Setup({ cwd, onReady }) {
  const { exit } = useApp();
  const [index, setIndex] = useState(0);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState(null);

  const localTarget = path.join(cwd, TODO_DIR_NAME);
  const options = [
    {
      label: `Create ${TODO_DIR_NAME} here`,
      hint: localTarget,
      run: () => {
        ensureDir(localTarget);
        createList(localTarget, path.basename(cwd) || 'Tasks', 'tasks');
        onReady({ root: localTarget, source: 'local' });
      },
    },
    {
      label: 'Use another folder',
      hint: 'the path is remembered for this directory',
      run: () => {
        setError(null);
        setTyping(true);
      },
    },
    {
      label: 'Quit',
      hint: 'nothing is written to disk',
      run: () => exit(),
    },
  ];

  const applyPath = (raw) => {
    const target = expandPath(raw, cwd);
    if (!target) {
      setError('enter a path, or press esc to go back');
      return;
    }
    try {
      ensureDir(target);
    } catch (err) {
      setError(`cannot use that path: ${err.message}`);
      return;
    }
    const saved = rememberRoot(cwd, target);
    setTyping(false);
    onReady({
      root: target,
      source: 'config',
      note: saved ? null : 'could not save this choice — it will be asked again next time',
    });
  };

  useInput(
    (input, key) => {
      if (typing) return;
      if (input === 'q' || key.escape) {
        exit();
        return;
      }
      if (key.upArrow || input === 'k') {
        setIndex((i) => (i === 0 ? options.length - 1 : i - 1));
        return;
      }
      if (key.downArrow || input === 'j') {
        setIndex((i) => (i === options.length - 1 ? 0 : i + 1));
        return;
      }
      if (key.return || input === ' ') {
        setError(null);
        try {
          options[index].run();
        } catch (err) {
          setError(err.message);
        }
      }
    },
    { isActive: !typing },
  );

  const boxWidth = Math.min(76, Math.max(52, (process.stdout.columns ?? 80) - 2));
  const contentWidth = boxWidth - 4;

  return h(
    Box,
    { flexDirection: 'column', width: boxWidth, marginTop: 1 },
    h(
      Box,
      {
        flexDirection: 'column',
        width: boxWidth,
        borderStyle: glyphs.border,
        borderColor: colors.accent,
        paddingX: 1,
      },
      h(
        Text,
        null,
        h(Text, { bold: true, color: colors.accent }, `${glyphs.logo} todo`),
        h(Text, { dimColor: true }, '   first run in this directory'),
      ),
      h(Text, null, ' '),
      h(Text, null, 'No task storage is set up for'),
      h(Text, { color: colors.partial }, truncateStart(cwd, contentWidth)),
      h(Text, null, ' '),
      typing
        ? h(
            Box,
            { flexDirection: 'column' },
            h(
              Box,
              null,
              h(Text, { bold: true, color: colors.accent }, 'Folder: '),
              h(TextInput, {
                onSubmit: applyPath,
                onCancel: () => {
                  setTyping(false);
                  setError(null);
                },
                placeholder: 'C:\\path\\to\\tasks  or  ~/notes/todo',
                fieldWidth: contentWidth - 8,
              }),
            ),
            h(Text, { dimColor: true }, 'created if missing   enter confirm   esc back'),
          )
        : options.map((option, i) =>
            h(Option, {
              key: option.label,
              label: option.label,
              hint: option.hint,
              selected: i === index,
              contentWidth,
            }),
          ),
      error ? h(Text, { color: colors.danger }, error) : null,
    ),
    typing
      ? null
      : h(Text, { dimColor: true }, '  up/down choose   enter confirm   q quit'),
  );
}
