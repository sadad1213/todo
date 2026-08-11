import React from 'react';
import { Box, Text } from 'ink';
import { colors, glyphs } from '../theme.js';
import { truncate, width as displayWidth } from '../text.js';
import TextInput from './TextInput.js';

const h = React.createElement;

const HINTS = {
  prompt: 'enter save   esc cancel   ctrl+u clear   ctrl+w delete word',
  confirm: 'y confirm   n / esc cancel',
  tasks:
    'a add  s subtask  e rename  d delete  space toggle  J/K move  tab lists  ? help  q quit',
  lists: 'n new  R rename  X delete  enter open  tab tasks  r rescan  ? help  q quit',
};

const TONES = {
  info: { color: colors.accent },
  warn: { color: colors.partial },
  error: { color: colors.danger },
  ok: { color: colors.done },
};

// Always renders exactly two lines: a context line (prompt / confirmation /
// status) and the key hints, so the layout height never shifts.
export default function Footer({ prompt, confirm, status, error, focus, barWidth, onPromptSubmit, onPromptCancel }) {
  const inner = Math.max(20, barWidth - 2);

  let top;
  let hint;

  if (prompt) {
    const label = `${prompt.label} `;
    top = h(
      Box,
      null,
      h(Text, { color: colors.accent, bold: true }, ' ' + label),
      h(TextInput, {
        // A fresh key per prompt resets the field's own value and cursor.
        key: prompt.id,
        initialValue: prompt.value ?? '',
        onSubmit: onPromptSubmit,
        onCancel: onPromptCancel,
        placeholder: prompt.placeholder ?? '',
        fieldWidth: Math.max(10, inner - displayWidth(label) - 1),
      }),
    );
    hint = HINTS.prompt;
  } else if (confirm) {
    top = h(Text, { color: colors.partial, bold: true }, ` ${truncate(confirm.label, inner)}`);
    hint = HINTS.confirm;
  } else if (status || error) {
    // A load error outranks a transient status and stays until it clears.
    const shown = error ? { text: error, tone: 'error' } : status;
    const tone = TONES[shown.tone] ?? TONES.info;
    top = h(Text, tone, ` ${glyphs.bullet} ${truncate(shown.text, inner - 2)}`);
    hint = focus === 'lists' ? HINTS.lists : HINTS.tasks;
  } else {
    top = h(Text, null, ' ');
    hint = focus === 'lists' ? HINTS.lists : HINTS.tasks;
  }

  return h(
    Box,
    { flexDirection: 'column', width: barWidth },
    top,
    h(Text, { dimColor: true }, ` ${truncate(hint, inner)}`),
  );
}
