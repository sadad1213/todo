import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function configFilePath() {
  if (process.platform === 'win32') {
    const base = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(base, 'todo-tui', 'config.json');
  }
  const base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(base, 'todo-tui', 'config.json');
}

function defaultRootDir() {
  return path.join(os.homedir(), '.todo-tui', 'lists');
}

// Resolution order: CLI flag > env var > config file > default (persisted on first run).
export function resolveRootDir(cliDir) {
  if (cliDir) return path.resolve(cliDir);
  if (process.env.TODO_TUI_DIR) return path.resolve(process.env.TODO_TUI_DIR);

  const cfgPath = configFilePath();
  try {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    if (cfg && typeof cfg.rootDir === 'string' && cfg.rootDir.trim()) {
      return path.resolve(cfg.rootDir);
    }
  } catch {
    // no config yet, or unreadable — fall through and create a default one
  }

  const dir = defaultRootDir();
  try {
    fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
    fs.writeFileSync(cfgPath, JSON.stringify({ rootDir: dir }, null, 2) + '\n', 'utf8');
  } catch {
    // non-fatal if we can't persist the config file
  }
  return dir;
}
