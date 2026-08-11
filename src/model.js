// Pure helpers for working with a list's task tree. No I/O here.
//
// A position in the tree is addressed by a `path`: `[i]` for a top-level task,
// `[i, j]` for the j-th subtask of the i-th task. Every mutating helper returns
// a brand new tasks array and leaves the input untouched.

export function isComposite(task) {
  return Array.isArray(task?.subtasks) && task.subtasks.length > 0;
}

export function normalizeList(raw, fallbackTitle) {
  const title = typeof raw?.title === 'string' && raw.title.trim() ? raw.title : fallbackTitle;
  const tasks = Array.isArray(raw?.tasks) ? raw.tasks.filter((t) => t && typeof t === 'object') : [];
  return { title, tasks };
}

export function taskAt(tasks, path) {
  if (!Array.isArray(path) || path.length === 0) return null;
  const [i, j] = path;
  const task = tasks[i];
  if (!task) return null;
  if (j === undefined) return task;
  return task.subtasks?.[j] ?? null;
}

export function samePath(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

// A composite task's own `done` is always derived from its subtasks.
function syncParent(task) {
  if (isComposite(task)) {
    task.done = task.subtasks.every((s) => !!s.done);
  }
}

// Flattens the tree into renderable/navigable rows. Unlike the old version,
// every row is selectable — headers included, so they can be renamed, moved,
// collapsed and bulk-toggled.
export function flattenTasks(tasks, isCollapsed = () => false) {
  const rows = [];
  tasks.forEach((task, i) => {
    if (isComposite(task)) {
      const collapsed = !!isCollapsed(task, i);
      rows.push({ type: 'header', path: [i], task, collapsed });
      if (!collapsed) {
        task.subtasks.forEach((sub, j) => {
          rows.push({
            type: 'subtask',
            path: [i, j],
            task: sub,
            last: j === task.subtasks.length - 1,
          });
        });
      }
    } else {
      rows.push({ type: 'task', path: [i], task });
    }
  });
  return rows;
}

export function rowIndexForPath(rows, path) {
  return rows.findIndex((r) => samePath(r.path, path));
}

// Toggling a header sets every subtask at once: all done -> all undone, and
// anything else -> all done.
export function toggleAt(tasks, path) {
  const next = structuredClone(tasks);
  const [i, j] = path;
  const task = next[i];
  if (!task) return tasks;

  if (j === undefined) {
    if (isComposite(task)) {
      const allDone = task.subtasks.every((s) => !!s.done);
      for (const sub of task.subtasks) sub.done = !allDone;
      task.done = !allDone;
    } else {
      task.done = !task.done;
    }
  } else {
    const sub = task.subtasks?.[j];
    if (!sub) return tasks;
    sub.done = !sub.done;
    syncParent(task);
  }
  return next;
}

export function setTitleAt(tasks, path, title) {
  const clean = String(title ?? '').trim();
  if (!clean) return tasks;
  const next = structuredClone(tasks);
  const [i, j] = path;
  const task = next[i];
  if (!task) return tasks;

  if (j === undefined) {
    task.title = clean;
  } else if (task.subtasks?.[j]) {
    task.subtasks[j].title = clean;
  } else {
    return tasks;
  }
  return next;
}

// Appends a top-level task. `after` (a path) inserts right below that task's
// group instead, which is what you want when adding from the middle of a list.
export function addTask(tasks, title, after) {
  const clean = String(title ?? '').trim();
  if (!clean) return { tasks, path: null };
  const next = structuredClone(tasks);
  const at = after && after.length ? after[0] + 1 : next.length;
  next.splice(at, 0, { title: clean, done: false });
  return { tasks: next, path: [at] };
}

// Adds a subtask under the task addressed by `path` (a subtask path adds a
// sibling under the same parent). A simple task becomes composite here.
export function addSubtask(tasks, path, title) {
  const clean = String(title ?? '').trim();
  if (!clean) return { tasks, path: null };
  const next = structuredClone(tasks);
  const [i, j] = path ?? [];
  const parent = next[i];
  if (!parent) return { tasks, path: null };

  if (!Array.isArray(parent.subtasks)) parent.subtasks = [];
  const at = j === undefined ? parent.subtasks.length : j + 1;
  parent.subtasks.splice(at, 0, { title: clean, done: false });
  syncParent(parent);
  return { tasks: next, path: [i, at] };
}

// Removing the last subtask turns the parent back into a simple task.
export function removeAt(tasks, path) {
  const next = structuredClone(tasks);
  const [i, j] = path;
  const task = next[i];
  if (!task) return { tasks, path: null };

  if (j === undefined) {
    next.splice(i, 1);
    const fallback = next.length ? [Math.min(i, next.length - 1)] : null;
    return { tasks: next, path: fallback };
  }

  if (!task.subtasks?.[j]) return { tasks, path: null };
  task.subtasks.splice(j, 1);
  if (task.subtasks.length === 0) {
    delete task.subtasks;
    return { tasks: next, path: [i] };
  }
  syncParent(task);
  return { tasks: next, path: [i, Math.min(j, task.subtasks.length - 1)] };
}

// Moves a task within its own level only — a subtask never jumps out of its
// parent, and a top-level task carries its subtasks with it.
export function moveAt(tasks, path, delta) {
  const next = structuredClone(tasks);
  const [i, j] = path;

  if (j === undefined) {
    const to = i + delta;
    if (to < 0 || to >= next.length) return { tasks, path };
    [next[i], next[to]] = [next[to], next[i]];
    return { tasks: next, path: [to] };
  }

  const parent = next[i];
  const subs = parent?.subtasks;
  if (!subs) return { tasks, path };
  const to = j + delta;
  if (to < 0 || to >= subs.length) return { tasks, path };
  [subs[j], subs[to]] = [subs[to], subs[j]];
  return { tasks: next, path: [i, to] };
}

// Leaf-level progress: a composite task counts as its subtasks, not as one.
export function countProgress(tasks) {
  let total = 0;
  let done = 0;
  for (const task of tasks ?? []) {
    if (isComposite(task)) {
      for (const sub of task.subtasks) {
        total += 1;
        if (sub.done) done += 1;
      }
    } else {
      total += 1;
      if (task.done) done += 1;
    }
  }
  return { total, done };
}

export function taskState(task) {
  if (!isComposite(task)) return task.done ? 'done' : 'todo';
  const done = task.subtasks.filter((s) => s.done).length;
  if (done === 0) return 'todo';
  return done === task.subtasks.length ? 'done' : 'partial';
}
