# todo-tui

A terminal todo list backed by plain JSON files on disk. Create, rename,
reorder and complete tasks without leaving the TUI — or let a text editor
or an AI agent write the JSON directly. Both sides stay in sync: the app
watches the files and picks up outside changes live.

```
 ▍ todo  ~/projects/app/.todo  [./.todo]                    2 lists  3/6

╭─────────────────────────╮ ╭──────────────────────────────────────────────╮
│ LISTS                   │ │ EXAMPLE PROJECT                          3/6 │
│ ▌◐ Example project      │ │ ▌○ Simple standalone task                    │
│    ━━━━━━━━──────  3/6  │ │  ✔ Set up repository                         │
│  ○ Notes                │ │  ▾ Implement feature X          ━━━───── 1/3 │
│    ──────────────  0/1  │ │    ├ ✔ Write the parser                      │
│                         │ │    ├ ○ Write the tests                       │
│                         │ │    └ ○ Update the docs                       │
╰─────────────────────────╯ ╰──────────────────────────────────────────────╯

 a add  s subtask  e rename  d delete  space toggle  J/K move  ? help  q quit
```

## Install

```bash
npm install
npm link      # optional: puts a global `todo` command on your PATH
```

Requires Node 22 or newer.

## First run

Run `todo` in a project directory. If nothing is set up for that
directory yet, it asks once:

```
╭──────────────────────────────────────────────────╮
│ ▍ todo   first run in this directory             │
│                                                  │
│ No task storage is set up for                    │
│ ~/projects/app                                   │
│                                                  │
│ ▌ ◐ Create .todo here                            │
│     ~/projects/app/.todo                         │
│   ○ Use another folder                           │
│     the path is remembered for this directory    │
│   ○ Quit                                         │
│     nothing is written to disk                   │
╰──────────────────────────────────────────────────╯
```

- **Create `.todo` here** makes a `.todo/` folder next to your code with
  a starter `tasks.json` in it. Nothing else on your machine changes.
- **Use another folder** asks for a path (absolute, relative or `~/…`),
  creates it if needed, and remembers that *this* directory maps to it —
  so plain `todo` finds it again next time.

Nothing is written until you choose. `todo --setup` asks again later, and
`todo --forget` drops the saved mapping for the current directory.

## Where the tasks live

The app watches one **root folder**, resolved in this order:

1. `--dir <path>`
2. the `TODO_TUI_DIR` environment variable
3. a folder saved for the current directory — or any parent of it
4. a `.todo/` folder in the current directory — or any parent of it
5. otherwise the first-run screen above

Saved mappings live in a single config file:

- Windows: `%APPDATA%\todo-tui\config.json`
- Linux/macOS: `~/.config/todo-tui/config.json`

Because both saved mappings and `.todo/` folders are looked up **up the
directory tree**, running `todo` anywhere inside a project finds that
project's tasks. The header always shows which folder is in use and why
(`[./.todo]`, `[saved]`, `[--dir]`, …).

Inside the root folder, each list is one JSON file:

```
.todo/
  tasks.json        -> a list
  release.json      -> another list
  archive/old.json  -> also works: one folder per list, first .json wins
```

## Keys

| Key | Action |
|---|---|
| `↑` `↓` / `k` `j` | Move |
| `←` `→` / `Tab` | Switch between the lists pane and the tasks pane |
| `g` / `G` | Jump to first / last task |
| `PgUp` / `PgDn` | Page up / down |
| `Space` | Toggle done |
| `Enter` | Toggle done, or fold/unfold a group |
| `a` | Add a task |
| `s` | Add a subtask under the selected task |
| `e` | Rename the selected task |
| `d` | Delete the selected task (asks first) |
| `K` / `J` | Move the selected task up / down |
| `z` | Fold / unfold every group |
| `n` | New list |
| `R` | Rename the current list |
| `X` | Delete the current list and its file (asks first) |
| `r` | Rescan from disk |
| `?` | Key reference |
| `q` | Quit |

While typing a title: `Enter` saves, `Esc` cancels, `Ctrl+U` clears the
line, `Ctrl+W` deletes the previous word.

Every edit is written to the list's JSON file immediately — there is no
separate save step.

## Options

```
todo [options]

  --dir <path>   Use this folder for this run
  --save         Remember --dir as the folder for the current directory
  --setup        Ask again where this directory's tasks should live
  --forget       Drop the saved folder for the current directory
  --ascii        Draw with ASCII only, for terminals without box glyphs
  -v, --version  Print the version
  -h, --help     Print help
```

Try the bundled example without touching your config:

```bash
todo --dir ./example/lists
```

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

- `title` is optional — it defaults to the file name (or folder name).
- A task **without** `subtasks` is a simple task, toggled through its own
  `done` field.
- A task **with** a non-empty `subtasks` array is a group: it renders as
  a foldable header with `(done/total)` progress. Its own `done` is
  derived automatically — true only when every subtask is done — and
  rewritten on save, so you can omit it.
- Toggling a group in the TUI sets all of its subtasks at once.
- Any other top-level keys in the file are preserved when the TUI writes
  it back, so extra metadata survives a round trip.

## For agents

An agent only needs to write one JSON file in the root folder for a list
to appear — no command to run, no process to restart. The TUI redraws
within about 150 ms of the file changing.

Useful details:

- The root folder is discoverable from the config file, or is just
  `.todo/` in (or above) the project directory.
- Writes from the TUI are atomic (temp file + rename), so a concurrent
  reader never sees a half-written list.
- Unknown fields are preserved, so an agent can keep its own bookkeeping
  next to `title` and `tasks`.

## Known limitations

- Task trees are two levels deep: tasks and subtasks.
- Fold state is per session and is not written to the JSON.
- The TUI needs an interactive terminal (a stdin that supports raw mode),
  so it won't run over a pipe or in CI.
