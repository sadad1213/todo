import fs from 'node:fs';
import path from 'node:path';
import chokidar from 'chokidar';
import { normalizeList } from './model.js';

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

// Each direct subdirectory of rootDir is one list. The first *.json file
// (alphabetically) found inside it holds the list's title + tasks.
export function scanLists(rootDir) {
  ensureDir(rootDir);

  const entries = fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  return entries.map((entry) => {
    const dirPath = path.join(rootDir, entry.name);
    let jsonFiles = [];
    try {
      jsonFiles = fs
        .readdirSync(dirPath, { withFileTypes: true })
        .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.json'))
        .map((e) => e.name)
        .sort();
    } catch {
      // directory disappeared between readdir calls (race with an editor/agent) — treat as empty
    }

    if (jsonFiles.length === 0) {
      return {
        id: entry.name,
        dirPath,
        filePath: null,
        title: entry.name,
        tasks: [],
        error: null,
        empty: true,
      };
    }

    const filePath = path.join(dirPath, jsonFiles[0]);
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const { title, tasks } = normalizeList(raw, entry.name);
      return { id: entry.name, dirPath, filePath, title, tasks, error: null, empty: false };
    } catch (err) {
      return {
        id: entry.name,
        dirPath,
        filePath,
        title: entry.name,
        tasks: [],
        error: err.message,
        empty: false,
      };
    }
  });
}

export function saveList(list, tasks) {
  if (!list.filePath) return;
  const data = { title: list.title, tasks };
  fs.writeFileSync(list.filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export function watchLists(rootDir, onChange) {
  const watcher = chokidar.watch(rootDir, { depth: 2, ignoreInitial: true });
  let timer = null;
  const trigger = () => {
    clearTimeout(timer);
    timer = setTimeout(onChange, 150);
  };
  watcher
    .on('add', trigger)
    .on('change', trigger)
    .on('unlink', trigger)
    .on('addDir', trigger)
    .on('unlinkDir', trigger);

  return () => {
    clearTimeout(timer);
    watcher.close();
  };
}
