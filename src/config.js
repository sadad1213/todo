import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const TODO_DIR_NAME = '.todo';

export function configFilePath() {
  if (process.platform === 'win32') {
    const base = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(base, 'todo-tui', 'config.json');
  }
  const base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(base, 'todo-tui', 'config.json');
}

export function readConfig() {
  try {
    const cfg = JSON.parse(fs.readFileSync(configFilePath(), 'utf8'));
    return {
      roots: cfg && typeof cfg.roots === 'object' && cfg.roots ? cfg.roots : {},
      ...cfg,
    };
  } catch {
    return { roots: {} };
  }
}

export function writeConfig(cfg) {
  const file = configFilePath();
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(cfg, null, 2)}\n`, 'utf8');
    return true;
  } catch {
    // A missing config is never fatal — the app just asks again next time.
    return false;
  }
}

// Config keys are absolute paths; normalise so `C:\Foo\` and `C:/foo` agree.
function dirKey(dir) {
  const resolved = path.resolve(dir);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

// Remembers "when launched from `dir`, use `root`" for future runs.
export function rememberRoot(dir, root) {
  const cfg = readConfig();
  cfg.roots = { ...cfg.roots, [dirKey(dir)]: path.resolve(root) };
  return writeConfig(cfg);
}

// Returns true only when a mapping actually existed and was removed.
export function forgetRoot(dir) {
  const cfg = readConfig();
  const key = dirKey(dir);
  if (!cfg.roots || !(key in cfg.roots)) return false;
  delete cfg.roots[key];
  return writeConfig(cfg);
}

// Accepts what people actually type or paste: `~`, a relative path, or a path
// still wrapped in the quotes the file manager added.
export function expandPath(input, cwd = process.cwd()) {
  let value = String(input ?? '').trim();
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      value = value.slice(1, -1).trim();
    }
  }
  if (!value) return null;
  if (value === '~') return os.homedir();
  if (value.startsWith('~/') || value.startsWith('~\\')) {
    return path.join(os.homedir(), value.slice(2));
  }
  return path.resolve(cwd, value);
}

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function parentChain(start) {
  const chain = [];
  let dir = path.resolve(start);
  for (;;) {
    chain.push(dir);
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return chain;
}

// Walks up from `cwd` looking for something to use, checking each level for a
// saved mapping first and a physical `.todo` folder second. That ordering lets
// an explicit "use this other path" override a stray `.todo` in the same spot.
export function findRootFor(cwd) {
  const { roots } = readConfig();
  const chain = parentChain(cwd);

  for (const dir of chain) {
    const saved = roots?.[dirKey(dir)];
    if (saved && isDir(saved)) {
      return { root: saved, source: dir === chain[0] ? 'config' : 'config-parent', from: dir };
    }

    const local = path.join(dir, TODO_DIR_NAME);
    if (isDir(local)) {
      return { root: local, source: dir === chain[0] ? 'local' : 'local-parent', from: dir };
    }
  }
  return null;
}

// Returns `{ root, source }`, or `null` when nothing is configured yet — in
// which case the caller shows the first-run setup screen.
export function resolveRoot({ cliDir, cwd = process.cwd(), ignoreSaved = false } = {}) {
  if (cliDir) return { root: path.resolve(cwd, cliDir), source: 'flag', from: cwd };
  if (process.env.TODO_TUI_DIR) {
    return { root: path.resolve(process.env.TODO_TUI_DIR), source: 'env', from: cwd };
  }
  if (ignoreSaved) return null;
  return findRootFor(cwd);
}

export function describeSource(source) {
  switch (source) {
    case 'flag':
      return '--dir';
    case 'env':
      return 'TODO_TUI_DIR';
    case 'local':
      return `./${TODO_DIR_NAME}`;
    case 'local-parent':
      return `${TODO_DIR_NAME} (parent)`;
    case 'config':
      return 'saved';
    case 'config-parent':
      return 'saved (parent)';
    default:
      return source ?? '';
  }
}
