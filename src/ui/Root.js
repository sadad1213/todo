import React, { useState } from 'react';
import App from './App.js';
import Setup from './Setup.js';

const h = React.createElement;

// Decides between the first-run setup screen and the app itself. `initial` is
// null when nothing is configured for the current directory yet.
export default function Root({ initial, cwd }) {
  const [resolved, setResolved] = useState(initial);

  if (!resolved) {
    return h(Setup, { cwd, onReady: setResolved });
  }
  return h(App, { root: resolved.root, source: resolved.source });
}
