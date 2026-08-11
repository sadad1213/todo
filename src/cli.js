import React from 'react';
import { render } from 'ink';
import { resolveRootDir, configFilePath } from './config.js';
import App from './App.js';

function parseArgs(argv) {
  let dir = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dir') {
      dir = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--dir=')) {
      dir = arg.slice('--dir='.length);
    } else if (arg === '-h' || arg === '--help') {
      printHelp();
      process.exit(0);
    }
  }
  return { dir };
}

function printHelp() {
  process.stdout.write(`todo — TUI todo list backed by JSON files

Usage: todo [--dir <path>]

Root directory resolution order:
  1. --dir <path>
  2. TODO_TUI_DIR environment variable
  3. "rootDir" in ${configFilePath()}
  4. default: ~/.todo-tui/lists

Each subfolder of the root directory is a separate list. Put one .json
file in it, e.g.:

  {
    "title": "My project",
    "tasks": [
      { "title": "Simple task", "done": false },
      { "title": "Task with subtasks", "subtasks": [
        { "title": "Subtask A", "done": true },
        { "title": "Subtask B", "done": false }
      ] }
    ]
  }
`);
}

export function runCli(argv) {
  const { dir } = parseArgs(argv);
  const rootDir = resolveRootDir(dir);

  if (!process.stdin.isTTY) {
    process.stderr.write('todo-tui needs an interactive terminal (stdin is not a TTY).\n');
    process.exit(1);
  }

  render(React.createElement(App, { rootDir }));
}
