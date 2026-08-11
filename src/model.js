// Pure helpers for working with a list's task tree. No I/O here.

export function isComposite(task) {
  return Array.isArray(task?.subtasks) && task.subtasks.length > 0;
}

export function normalizeList(raw, fallbackTitle) {
  const title = typeof raw?.title === 'string' && raw.title.trim() ? raw.title : fallbackTitle;
  const tasks = Array.isArray(raw?.tasks) ? raw.tasks : [];
  return { title, tasks };
}

// Flattens tasks into renderable/navigable rows.
// 'header' rows (composite tasks) are not directly togglable — their
// completion is derived from their subtasks.
export function flattenTasks(tasks) {
  const rows = [];
  tasks.forEach((task, taskIndex) => {
    if (isComposite(task)) {
      rows.push({ type: 'header', taskIndex, task });
      task.subtasks.forEach((sub, subIndex) => {
        rows.push({ type: 'subtask', taskIndex, subIndex, task: sub });
      });
    } else {
      rows.push({ type: 'task', taskIndex, task });
    }
  });
  return rows;
}

export function togglableRowIndices(rows) {
  const out = [];
  rows.forEach((r, i) => {
    if (r.type !== 'header') out.push(i);
  });
  return out;
}

// Returns a new tasks array with the given row toggled and parent
// completion recomputed where relevant.
export function toggleRow(tasks, row) {
  const next = structuredClone(tasks);
  if (row.type === 'task') {
    const t = next[row.taskIndex];
    t.done = !t.done;
  } else if (row.type === 'subtask') {
    const parent = next[row.taskIndex];
    const sub = parent.subtasks[row.subIndex];
    sub.done = !sub.done;
    parent.done = parent.subtasks.every((s) => !!s.done);
  }
  return next;
}

export function countProgress(tasks) {
  let total = 0;
  let done = 0;
  for (const t of tasks) {
    if (isComposite(t)) {
      for (const s of t.subtasks) {
        total += 1;
        if (s.done) done += 1;
      }
    } else {
      total += 1;
      if (t.done) done += 1;
    }
  }
  return { total, done };
}
