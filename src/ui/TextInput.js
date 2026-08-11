import React, { useEffect, useRef, useState } from 'react';
import { Text, useInput } from 'ink';
import { colors } from '../theme.js';

const h = React.createElement;

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

// Strips control characters so a stray escape sequence (or a pasted newline)
// can't end up inside a task title.
function sanitize(input) {
  return input.replace(CONTROL_CHARS, '');
}

function wordStart(chars, from) {
  let i = from;
  while (i > 0 && chars[i - 1] === ' ') i -= 1;
  while (i > 0 && chars[i - 1] !== ' ') i -= 1;
  return i;
}

// A single-line text field: cursor, word/line editing, horizontal scrolling for
// values longer than the field, and paste support (Ink hands a pasted string to
// the handler in one go, so inserting `input` wholesale is enough).
//
// The value is owned here rather than lifted to the caller on purpose: Ink can
// deliver several keystrokes in a single React batch (fast typing, or a held
// backspace), and only a functional state update sees every one of them.
// Remount with a `key` to start a new edit.
export default function TextInput({
  initialValue = '',
  onSubmit,
  onCancel,
  placeholder = '',
  fieldWidth = 40,
  isActive = true,
}) {
  const [state, setState] = useState(() => ({
    value: initialValue,
    cursor: [...initialValue].length,
  }));

  // Mirrors the committed value so submit never reads a stale closure.
  const latest = useRef(state.value);
  useEffect(() => {
    latest.current = state.value;
  }, [state.value]);

  const edit = (fn) =>
    setState((prev) => {
      const chars = [...prev.value];
      const next = fn(chars, Math.min(prev.cursor, chars.length));
      return {
        value: next.chars.join(''),
        cursor: Math.max(0, Math.min(next.cursor, next.chars.length)),
      };
    });

  const moveCursor = (fn) =>
    setState((prev) => {
      const length = [...prev.value].length;
      const at = Math.min(prev.cursor, length);
      return { ...prev, cursor: Math.max(0, Math.min(fn(at, length), length)) };
    });

  useInput(
    (input, key) => {
      if (key.escape) {
        onCancel?.();
        return;
      }
      if (key.return) {
        onSubmit?.(latest.current);
        return;
      }
      if (key.leftArrow) {
        moveCursor((at) => at - 1);
        return;
      }
      if (key.rightArrow) {
        moveCursor((at) => at + 1);
        return;
      }
      if (key.home || (key.ctrl && input === 'a')) {
        moveCursor(() => 0);
        return;
      }
      if (key.end || (key.ctrl && input === 'e')) {
        moveCursor((_at, length) => length);
        return;
      }
      if (key.backspace) {
        edit((chars, at) =>
          at === 0
            ? { chars, cursor: at }
            : { chars: [...chars.slice(0, at - 1), ...chars.slice(at)], cursor: at - 1 },
        );
        return;
      }
      if (key.delete) {
        edit((chars, at) => ({
          chars: [...chars.slice(0, at), ...chars.slice(at + 1)],
          cursor: at,
        }));
        return;
      }
      if (key.ctrl && input === 'u') {
        edit(() => ({ chars: [], cursor: 0 }));
        return;
      }
      if (key.ctrl && input === 'w') {
        edit((chars, at) => {
          const start = wordStart(chars, at);
          return { chars: [...chars.slice(0, start), ...chars.slice(at)], cursor: start };
        });
        return;
      }
      if (key.ctrl || key.meta || key.tab || key.upArrow || key.downArrow) return;

      const text = sanitize(input ?? '');
      if (!text) return;
      edit((chars, at) => ({
        chars: [...chars.slice(0, at), ...text, ...chars.slice(at)],
        cursor: at + [...text].length,
      }));
    },
    { isActive },
  );

  const field = Math.max(8, fieldWidth);
  const chars = [...state.value];
  const pos = Math.min(state.cursor, chars.length);

  if (chars.length === 0 && placeholder) {
    return h(
      Text,
      null,
      h(Text, { inverse: isActive }, placeholder.slice(0, 1)),
      h(Text, { dimColor: true }, placeholder.slice(1, field - 1)),
    );
  }

  // Keep the cursor inside the visible window when the value overflows.
  const start = Math.max(0, pos - field + 1);
  const visible = chars.slice(start, start + field);
  const localPos = pos - start;

  return h(
    Text,
    null,
    start > 0 ? h(Text, { dimColor: true }, '<') : null,
    visible.slice(0, localPos).join(''),
    h(Text, { inverse: isActive, color: isActive ? colors.accent : undefined }, visible[localPos] ?? ' '),
    visible.slice(localPos + 1).join(''),
  );
}
