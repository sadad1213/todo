import fs from 'node:fs';
import path from 'node:path';
import chokidar from 'chokidar';
import { normalizeList } from './model.js';

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJsonFiles(dir) {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile() && !e.name.startsWith('.') && e.name.toLowerCase().endsWith('.json'))
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    // Vanished between readdir calls (an editor or agent racing us) — treat as empty.
    return [];
  }
}

function loadListFile(filePath, { id, dirPath, source }) {
  const base = {
    id,
    key: filePath ?? dirPath,
    filePath,
    dirPath,
    source,
    title: id,
    tasks: [],
    raw: {},
    error: null,
    empty: false,
  };
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const { title, tasks } = normalizeList(raw, id);
    return { ...base, raw: raw && typeof raw === 'object' ? raw : {}, title, tasks };
  } catch (err) {
    return { ...base, error: err.message };
  }
}

// Two layouts are supported, and they can be mixed in one root:
//   root/<name>.json            -> a list (this is what `.todo` folders use)
//   root/<name>/whatever.json   -> a list (the original nested layout)
export function scanLists(root) {
  ensureDir(root);

  const lists = readJsonFiles(root).map((name) =>
    loadListFile(path.join(root, name), {
      id: path.basename(name, path.extname(name)),
      dirPath: root,
      source: 'file',
    }),
  );

  let dirs = [];
  try {
    dirs = fs
      .readdirSync(root, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    dirs = [];
  }

  for (const name of dirs) {
    const dirPath = path.join(root, name);
    const files = readJsonFiles(dirPath);
    if (files.length === 0) {
      lists.push({
        id: name,
        key: dirPath,
        filePath: null,
        dirPath,
        source: 'dir',
        title: name,
        tasks: [],
        raw: {},
        error: null,
        empty: true,
      });
      continue;
    }
    lists.push(
      loadListFile(path.join(dirPath, files[0]), { id: name, dirPath, source: 'dir' }),
    );
  }

  return lists.sort((a, b) => a.title.localeCompare(b.title));
}

// Write to a sibling temp file and rename over the target, so a watcher (or an
// agent) never reads a half-written list.
function writeJsonAtomic(filePath, data) {
  const tmp = `${filePath}.${process.pid}.tmp`;
  const body = `${JSON.stringify(data, null, 2)}\n`;
  fs.writeFileSync(tmp, body, 'utf8');
  try {
    fs.renameSync(tmp, filePath);
  } catch (err) {
    try {
      fs.unlinkSync(tmp);
    } catch {
      // best effort
    }
    throw err;
  }
}

// Unknown top-level keys in the file are preserved, so extra metadata an agent
// wrote alongside `title`/`tasks` survives a round trip through the TUI.
export function saveList(list, { tasks, title } = {}) {
  if (!list?.filePath) return false;
  const data = {
    ...(list.raw ?? {}),
    title: title ?? list.title,
    tasks: tasks ?? list.tasks,
  };
  writeJsonAtomic(list.filePath, data);
  return true;
}

function slugify(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function createList(root, title, preferredBase) {
  const clean = String(title ?? '').trim();
  if (!clean) return null;
  ensureDir(root);

  const base = preferredBase || slugify(clean) || 'list';
  let filePath = path.join(root, `${base}.json`);
  for (let n = 2; fs.existsSync(filePath); n += 1) {
    filePath = path.join(root, `${base}-${n}.json`);
  }

  writeJsonAtomic(filePath, { title: clean, tasks: [] });
  return filePath;
}

// Deletes the list's JSON file, and the folder too if that folder was the list
// (nested layout) and is now empty.
export function deleteList(list) {
  if (!list) return false;
  if (list.filePath) {
    try {
      fs.unlinkSync(list.filePath);
    } catch {
      return false;
    }
  }
  if (list.source === 'dir' && list.dirPath) {
    try {
      if (fs.readdirSync(list.dirPath).length === 0) fs.rmdirSync(list.dirPath);
    } catch {
      // leaving a non-empty folder behind is fine
    }
  }
  return true;
}

export function watchLists(root, onChange) {
  const watcher = chokidar.watch(root, { depth: 2, ignoreInitial: true });
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
