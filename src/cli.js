import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { render } from 'ink';
import {
  TODO_DIR_NAME,
  configFilePath,
  expandPath,
  forgetRoot,
  rememberRoot,
  resolveRoot,
} from './config.js';
import { useAsciiGlyphs } from './theme.js';
import Root from './ui/Root.js';

function packageVersion() {
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(fs.readFileSync(path.join(here, '..', 'package.json'), 'utf8'));
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function parseArgs(argv) {
  const options = { dir: null, save: false, setup: false, forget: false, ascii: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dir') {
      options.dir = argv[i + 1] ?? null;
      i += 1;
    } else if (arg.startsWith('--dir=')) {
      options.dir = arg.slice('--dir='.length);
    } else if (arg === '--save') {
      options.save = true;
    } else if (arg === '--setup') {
      options.setup = true;
    } else if (arg === '--forget') {
      options.forget = true;
    } else if (arg === '--ascii') {
      options.ascii = true;
    } else if (arg === '-v' || arg === '--version') {
      process.stdout.write(`${packageVersion()}\n`);
      process.exit(0);
    } else if (arg === '-h' || arg === '--help') {
      printHelp();
      process.exit(0);
    } else {
      process.stderr.write(`todo: unknown option "${arg}"\n`);
      process.exit(2);
    }
  }
  return options;
}

function printHelp() {
  process.stdout.write(`todo — a terminal todo list backed by JSON files

Usage: todo [options]

Options:
  --dir <path>   Use this folder for this run
  --save         Remember --dir as the folder for the current directory
  --setup        Ask again where this directory's tasks should live
  --forget       Drop the saved folder for the current directory
  --ascii        Draw with ASCII only (for terminals without box glyphs)
  -v, --version  Print the version
  -h, --help     Print this help

Where tasks are stored, in order:
  1. --dir <path>
  2. TODO_TUI_DIR environment variable
  3. a saved choice for the current directory (or a parent)
  4. a ${TODO_DIR_NAME}/ folder in the current directory (or a parent)
  5. otherwise todo asks on first run

Saved choices live in ${configFilePath()}

Every *.json file in that folder is one list:

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
  const options = parseArgs(argv);
  const cwd = process.cwd();

  useAsciiGlyphs(options.ascii || process.env.TODO_TUI_ASCII === '1');

  if (options.forget) {
    const removed = forgetRoot(cwd);
    process.stdout.write(
      removed
        ? `todo: forgot the saved folder for ${cwd}\n`
        : `todo: no saved folder for ${cwd}\n`,
    );
    if (!options.setup) return;
  }

  if (options.dir && options.save) {
    const target = expandPath(options.dir, cwd);
    if (target) rememberRoot(cwd, target);
  }

  const resolved = resolveRoot({ cliDir: options.dir, cwd, ignoreSaved: options.setup });

  if (!process.stdin.isTTY) {
    process.stderr.write('todo needs an interactive terminal (stdin is not a TTY).\n');
    process.exit(1);
  }

  render(React.createElement(Root, { initial: resolved, cwd }), {
    alternateScreen: true,
    exitOnCtrlC: true,
  });
}
