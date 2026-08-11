# todo-tui

A terminal (TUI) todo list backed by plain JSON files on disk. Edit them
by hand, with a text editor, or through an AI agent (e.g. Claude Code) —
the app picks up changes live.

## Install

```bash
npm install
```

To get a global `todo` command available from anywhere:

```bash
npm link
```

## Run

```bash
todo
# or, without installing globally:
npm start
node bin/todo-tui.js
```

Try the bundled example:

```bash
todo --dir ./example/lists
```

## Keys

| Key | Action |
|---|---|
| `↑`/`↓` or `k`/`j` | Move between tasks |
| `←`/`→` or `Tab`/`Shift+Tab` | Switch between lists |
| `Space` / `Enter` | Toggle done |
| `r` | Force a rescan |
| `q` / `Esc` | Quit |

## Where the data lives

The app watches **one root directory**. Every direct subfolder of it is a
separate list. Each subfolder should contain one `.json` file (any name;
if there are several, the first one alphabetically is used).

Root directory resolution order:

1. `--dir <path>` flag
2. `TODO_TUI_DIR` environment variable
3. `rootDir` field in the config file:
   - Windows: `%APPDATA%\todo-tui\config.json`
   - Linux/macOS: `~/.config/todo-tui/config.json`
4. default: `~/.todo-tui/lists`

A config file with the default path is created automatically on first
run — the currently watched path is shown right in the TUI header
(`watching ...`).

File changes (folders added/removed, json edited) are picked up
automatically — the app watches the directory with `chokidar`.

## List JSON format

```json
{
  "title": "List title",
  "tasks": [
    { "title": "Simple task", "done": false },
    {
      "title": "Task with subtasks",
      "subtasks": [
        { "title": "Subtask A", "done": true },
        { "title": "Subtask B", "done": false }
      ]
    }
  ]
}
```

Rules:

- The list's `title` is optional — defaults to the folder name.
- A task **without** `subtasks` (or with an empty array) is a simple
  task, toggled via its own `done` field.
- A task **with** a non-empty `subtasks` array is composite: it's shown
  as a header with progress `(done/total)`, and only its subtasks can be
  toggled individually. Its own `done` field is derived automatically
  (true only when every subtask is done) and rewritten on save — you can
  omit it when creating the file.

This means an agent only needs to create a folder and one JSON file with
this shape for the list to show up in the TUI right away; completion
state can be edited from the TUI or straight in the file.

## Known limitations

- No scrolling: a task list taller than the terminal will just run off
  the bottom of the screen.
- The TUI needs an interactive terminal (a stdin that supports raw
  mode) — it won't run over a non-interactive pipe/CI.
