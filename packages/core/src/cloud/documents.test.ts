import { describe, expect, it } from 'vitest';
import { initialProgress, sanitizeProgress, type ProgressState } from '../state/progress';
import { dayTitle, diffDocs, fromDocs, toDocs, type DayDoc } from './documents';
import { fileNameFor } from './driveStore';

const pushDay: ProgressState = {
  ...initialProgress,
  onboarded: true,
  mastered: { 'wall-pushup': '2026-10-01T09:00:00.000Z' },
  goals: ['pullup'],
  logs: {
    pushup: [
      { id: 'p2', date: '2026-10-18T18:30:00.000Z', day: '2026-10-18', sets: 3, value: 7, planned: { sets: 3, value: 7 } },
      { id: 'p1', date: '2026-10-16T18:00:00.000Z', day: '2026-10-16', sets: 3, value: 6 },
    ],
    plank: [{ id: 'k1', date: '2026-10-18T18:40:00.000Z', day: '2026-10-18', sets: 3, value: 30 }],
  },
  workouts: {
    '2026-10-18': [{ title: 'Push + Core', focus: ['push', 'core'], length: 'standard', startedAt: '2026-10-18T18:20:00.000Z' }],
  },
};

describe('toDocs', () => {
  it('writes one progress document and one document per training day', () => {
    const docs = toDocs(pushDay);
    expect(Object.keys(docs).sort()).toEqual(['day:2026-10-16', 'day:2026-10-18', 'progress']);
    expect(docs.progress).toMatchObject({ kind: 'progress', mastered: pushDay.mastered, goals: ['pullup'] });
  });

  it('puts every set logged that day in the day document, readable on its own', () => {
    const day = toDocs(pushDay)['day:2026-10-18'] as DayDoc;
    expect(day.title).toBe('Push + Core');
    expect(day.workouts).toHaveLength(1);
    expect(day.sessions.map((s) => [s.name, s.sets, s.value, s.unit])).toEqual([
      ['Push-up', 3, 7, 'reps'],
      ['Plank', 3, 30, 'seconds'],
    ]);
    expect((toDocs(pushDay)['day:2026-10-16'] as DayDoc).title).toBe('Training');
  });

  it('round-trips through fromDocs', () => {
    expect(sanitizeProgress(fromDocs(toDocs(pushDay)))).toEqual(pushDay);
  });

  it('carries added weight, weigh-ins, the weight goal, units and workout calories', () => {
    const s: ProgressState = {
      ...pushDay,
      logs: {
        ...pushDay.logs,
        'weighted-dip': [
          { id: 'w1', date: '2026-10-18T18:50:00.000Z', day: '2026-10-18', sets: 3, value: 6, addedKg: 10, planned: { sets: 3, value: 6, addedKg: 10 } },
        ],
      },
      workouts: { '2026-10-18': [{ ...pushDay.workouts['2026-10-18'][0], finishedAt: '2026-10-18T19:00:00.000Z', kcal: 250 }] },
      weight: { '2026-10-18': { kg: 80.2, at: '2026-10-18T07:00:00.000Z' }, '2026-10-20': { kg: 80, at: '2026-10-20T07:00:00.000Z' } },
      weightGoal: { kg: 76, at: '2026-10-01T00:00:00.000Z' },
      units: 'kg',
      workoutPlan: { focus: ['push', 'handstand'], length: 'long', at: '2026-10-02T00:00:00.000Z' },
    };
    const docs = toDocs(s);
    expect(docs.progress).toMatchObject({ workoutPlan: s.workoutPlan });
    expect((docs['day:2026-10-18'] as DayDoc).weight).toEqual(s.weight['2026-10-18']);
    expect((docs['day:2026-10-18'] as DayDoc).sessions.find((x) => x.id === 'w1')).toMatchObject({ addedKg: 10 });
    expect((docs['day:2026-10-20'] as DayDoc).title).toBe('Weigh-in');
    expect(docs.progress).toMatchObject({ weightGoal: s.weightGoal, units: 'kg' });
    expect(sanitizeProgress(fromDocs(docs))).toEqual(s);
  });

  it('files sessions under the day they were logged even without a stored day', () => {
    const noDay: ProgressState = {
      ...initialProgress,
      logs: { pushup: [{ id: 'x', date: new Date(2026, 9, 18, 23, 30).toISOString(), sets: 3, value: 5 }] },
    };
    expect(Object.keys(toDocs(noDay))).toContain('day:2026-10-18');
  });
});

describe('fromDocs', () => {
  it('ignores junk and duplicate sessions', () => {
    const raw = fromDocs({
      progress: { mastered: { pushup: 'x' } },
      'day:2026-10-18': { sessions: [{ id: 'a', exercise: 'pushup', time: 't', sets: 3, value: 5 }, 'junk'] },
      'day:2026-10-19': { sessions: [{ id: 'a', exercise: 'pushup', time: 't', sets: 3, value: 5 }] },
      other: { sessions: [{ id: 'b', exercise: 'pushup' }] },
    });
    const s = sanitizeProgress(raw)!;
    expect(s.logs.pushup).toHaveLength(1);
    expect(s.mastered).toEqual({ pushup: 'x' });
  });
});

describe('diffDocs', () => {
  it('is null when nothing changed', () => {
    expect(diffDocs(pushDay, structuredClone(pushDay))).toBeNull();
  });

  it('rewrites only the day that changed', () => {
    const next = structuredClone(pushDay);
    next.logs.pushup[0].value = 8;
    const ops = diffDocs(pushDay, next)!;
    expect(Object.keys(ops.set)).toEqual(['day:2026-10-18']);
    expect(ops.remove).toEqual([]);
  });

  it('removes a day whose sessions were all deleted, and notices mastery changes', () => {
    const next = structuredClone(pushDay);
    next.logs.pushup = next.logs.pushup.filter((l) => l.id !== 'p1');
    next.mastered = {};
    const ops = diffDocs(pushDay, next)!;
    expect(ops.remove).toEqual(['day:2026-10-16']);
    expect(Object.keys(ops.set)).toEqual(['progress']);
  });
});

describe('file names', () => {
  it('names day files by date and workout', () => {
    expect(fileNameFor('day:2026-10-18', { title: 'Push + Pull' })).toBe('2026-10-18 Push + Pull.json');
    expect(fileNameFor('day:2026-10-18', {})).toBe('2026-10-18 Training.json');
    expect(fileNameFor('progress', {})).toBe('progress.json');
    expect(dayTitle([])).toBe('Training');
  });
});
