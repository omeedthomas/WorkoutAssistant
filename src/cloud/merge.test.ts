import { describe, expect, it } from 'vitest';
import { initialProgress, MAX_GOALS, type LogEntry, type ProgressState, type WorkoutRecord } from '../state/progress';
import { isPristine, mergeProgress, sameProgress } from './merge';

const log = (id: string, date: string, value = 5): LogEntry => ({ id, date, sets: 3, value });
const state = (p: Partial<ProgressState>): ProgressState => ({ ...initialProgress, ...p });
const workout = (startedAt: string, finishedAt?: string): WorkoutRecord => ({
  title: 'Push + Pull',
  focus: ['push', 'pull'],
  length: 'standard',
  startedAt,
  ...(finishedAt && { finishedAt }),
});

describe('mergeProgress', () => {
  it('keeps everything from both sides', () => {
    const local = state({
      mastered: { pushup: '2026-03-01', dip: '2026-02-01' },
      logs: { pushup: [log('a', '2026-03-02')] },
      goals: ['pullup'],
    });
    const remote = state({
      mastered: { pushup: '2026-01-01', squat: '2026-01-05' },
      logs: { pushup: [log('b', '2026-03-05')], squat: [log('c', '2026-01-04')] },
      goals: ['l-sit'],
      onboarded: true,
    });
    const merged = mergeProgress(local, remote);
    expect(merged.mastered).toEqual({ pushup: '2026-01-01', dip: '2026-02-01', squat: '2026-01-05' });
    expect(merged.logs.pushup.map((l) => l.id)).toEqual(['b', 'a']); // newest first
    expect(merged.logs.squat).toHaveLength(1);
    expect(merged.goals).toEqual(['l-sit', 'pullup']);
    expect(merged.onboarded).toBe(true);
  });

  it('does not duplicate a session present on both sides', () => {
    const shared = log('same', '2026-03-01');
    const merged = mergeProgress(state({ logs: { pushup: [shared] } }), state({ logs: { pushup: [shared] } }));
    expect(merged.logs.pushup).toHaveLength(1);
  });

  it('merges workouts and keeps the finished copy', () => {
    const merged = mergeProgress(
      state({ workouts: { '2026-10-18': [workout('t1', 'done'), workout('t2')] } }),
      state({ workouts: { '2026-10-18': [workout('t1')], '2026-10-17': [workout('t0')] } }),
    );
    expect(merged.workouts['2026-10-18']).toEqual([workout('t1', 'done'), workout('t2')]);
    expect(merged.workouts['2026-10-17']).toHaveLength(1);
  });

  it('caps goals at the limit', () => {
    const ids = ['pushup', 'pullup', 'dip', 'squat', 'l-sit', 'plank', 'pistol-squat'];
    const merged = mergeProgress(state({ goals: ids.slice(0, 4) }), state({ goals: ids.slice(3) }));
    expect(merged.goals).toHaveLength(MAX_GOALS);
  });
});

describe('helpers', () => {
  it('detects an empty device', () => {
    expect(isPristine(initialProgress)).toBe(true);
    expect(isPristine({ ...initialProgress, onboarded: true })).toBe(true);
    expect(isPristine(state({ goals: ['pushup'] }))).toBe(false);
    expect(isPristine(state({ workouts: { '2026-10-18': [workout('t')] } }))).toBe(false);
  });

  it('compares progress regardless of key order', () => {
    expect(sameProgress(state({ mastered: { a: '1', b: '2' } }), state({ mastered: { b: '2', a: '1' } }))).toBe(true);
  });
});
