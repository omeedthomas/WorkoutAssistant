import { MAX_GOALS, MAX_LOGS_PER_EXERCISE, type LogEntry, type ProgressState, type WorkoutRecord } from '../state/progress';

export const emptyProgress: ProgressState = {
  version: 1,
  mastered: {},
  logs: {},
  goals: [],
  onboarded: false,
  workouts: {},
};

/** Nothing worth keeping: no mastered skills, sessions, goals or workouts. */
export function isPristine(s: ProgressState): boolean {
  return (
    Object.keys(s.mastered).length === 0 &&
    Object.keys(s.logs).length === 0 &&
    s.goals.length === 0 &&
    Object.keys(s.workouts).length === 0
  );
}

/** JSON with object keys sorted, so equal data always compares equal. */
export const stable = (v: unknown) =>
  JSON.stringify(v, (_, x) =>
    x && typeof x === 'object' && !Array.isArray(x)
      ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, (x as Record<string, unknown>)[k]]))
      : x,
  );

export function sameProgress(a: ProgressState, b: ProgressState): boolean {
  return stable(a) === stable(b);
}

/**
 * Combines two copies of progress without losing anything: mastered skills,
 * sessions, goals and workouts from both. Used when signing in on a device that
 * already has progress, or when this device has changes the cloud never got.
 */
export function mergeProgress(local: ProgressState, remote: ProgressState): ProgressState {
  const mastered: Record<string, string> = { ...remote.mastered };
  for (const [id, at] of Object.entries(local.mastered)) {
    if (!mastered[id] || at < mastered[id]) mastered[id] = at; // keep the earliest date
  }

  const logs: Record<string, LogEntry[]> = {};
  for (const id of new Set([...Object.keys(local.logs), ...Object.keys(remote.logs)])) {
    const byId = new Map<string, LogEntry>();
    for (const l of [...(remote.logs[id] ?? []), ...(local.logs[id] ?? [])]) if (!byId.has(l.id)) byId.set(l.id, l);
    logs[id] = [...byId.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, MAX_LOGS_PER_EXERCISE);
  }

  const workouts: Record<string, WorkoutRecord[]> = {};
  for (const day of new Set([...Object.keys(local.workouts), ...Object.keys(remote.workouts)])) {
    const byStart = new Map<string, WorkoutRecord>();
    for (const w of [...(remote.workouts[day] ?? []), ...(local.workouts[day] ?? [])]) {
      const seen = byStart.get(w.startedAt);
      if (!seen || (!seen.finishedAt && w.finishedAt)) byStart.set(w.startedAt, w);
    }
    workouts[day] = [...byStart.values()].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  }

  const goals = [...new Set([...remote.goals, ...local.goals])].slice(0, MAX_GOALS);
  return { version: 1, mastered, logs, goals, onboarded: local.onboarded || remote.onboarded, workouts };
}
