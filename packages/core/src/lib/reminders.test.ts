import { describe, expect, it } from 'vitest';
import { initialProgress, type LogEntry, type ProgressState, type WorkoutRecord } from '../state/progress';
import { DAILY_REMINDER_DAYS, upcomingReminders } from './reminders';
import { todayAtAGlance } from './today';

const log = (id: string, day: string): LogEntry => ({ id, date: `${day}T12:00:00.000Z`, day, sets: 3, value: 8 });
const state = (p: Partial<ProgressState>): ProgressState => ({ ...initialProgress, ...p });
/** Local time on a day in October 2026. */
const oct = (day: number, hour = 0, minute = 0) => new Date(2026, 9, day, hour, minute);
const routine = (day: string): WorkoutRecord => ({
  title: 'Wake up',
  focus: ['mobility'],
  length: 'short',
  startedAt: `${day}T07:00:00.000Z`,
  finishedAt: `${day}T07:10:00.000Z`,
  routine: 'wake-up',
});

// Trained Oct 14 and 15, so the streak's last day is Oct 18.
const streaking = state({ logs: { pushup: [log('a', '2026-10-14'), log('b', '2026-10-15')] } });

describe('todayAtAGlance', () => {
  it('suggests a full-body day to someone new', () => {
    const t = todayAtAGlance(initialProgress, oct(18, 9));
    expect(t).toMatchObject({ day: '2026-10-18', title: 'Full body', planned: false, done: false, urgency: 'none' });
    expect(t.exercises).toBeGreaterThan(0);
    expect(t.minutes).toBeGreaterThan(0);
  });

  it('follows the workout plan', () => {
    const t = todayAtAGlance(state({ workoutPlan: { focus: ['pull', 'push'], length: 'short', at: '2026-10-01T00:00:00.000Z' } }), oct(18, 9));
    expect(t).toMatchObject({ focus: ['push', 'pull'], title: 'Push + Pull', length: 'short', planned: true });
  });

  it("counts logged sets as today's workout, but not a mobility routine", () => {
    expect(todayAtAGlance(state({ logs: { pushup: [log('a', '2026-10-18')] } }), oct(18, 20)).done).toBe(true);
    const morning = todayAtAGlance(state({ workouts: { '2026-10-18': [routine('2026-10-18')] } }), oct(18, 9));
    expect(morning.done).toBe(false);
    expect(morning.streak.trainedToday).toBe(true); // it still counts for the streak
  });
});

describe('upcomingReminders', () => {
  const streakOnly = { streak: true, dailyHour: null };

  it('sends nothing when both reminders are off, or without a streak', () => {
    expect(upcomingReminders(streaking, { streak: false, dailyHour: null }, oct(18, 9))).toEqual([]);
    expect(upcomingReminders(initialProgress, streakOnly, oct(18, 9))).toEqual([]);
  });

  it("reminds at 6 pm and 10 pm on the streak's last day", () => {
    const r = upcomingReminders(streaking, streakOnly, oct(16, 9));
    expect(r.map((x) => x.id)).toEqual(['streak@18:2026-10-18', 'streak@22:2026-10-18']);
    expect(r.map((x) => x.at)).toEqual([oct(18, 18), oct(18, 22)]);
    expect(r[0].title).toBe('Workout needed to keep your 2-day streak');
    expect(r[0].body).toBe('Your streak ends at midnight, 6h 0m from now. Any workout counts.');
    expect(r[1].body).toContain('2h 0m from now');
  });

  it('skips reminder times that have passed', () => {
    expect(upcomingReminders(streaking, streakOnly, oct(18, 19)).map((x) => x.id)).toEqual(['streak@22:2026-10-18']);
    expect(upcomingReminders(streaking, streakOnly, oct(18, 23))).toEqual([]);
  });

  it('moves to the new last day after training', () => {
    const trained = state({ logs: { pushup: [...streaking.logs.pushup, log('c', '2026-10-18')] } });
    expect(upcomingReminders(trained, streakOnly, oct(18, 19)).map((x) => x.id)).toEqual(['streak@18:2026-10-21', 'streak@22:2026-10-21']);
  });

  it("schedules a week of daily reminders, starting tomorrow once today's workout is done", () => {
    const daily = { streak: false, dailyHour: 8 };
    const ahead = upcomingReminders(initialProgress, daily, oct(18, 7));
    expect(ahead).toHaveLength(DAILY_REMINDER_DAYS);
    expect(ahead[0]).toMatchObject({ id: 'daily:2026-10-18', at: oct(18, 8), title: 'Time to train' });
    expect(ahead[0].body).toMatch(/^Today: Full body, \d+ exercises, about \d+ min\.$/);
    expect(ahead[1].body).toBe('Your workout for today is ready in Ascent.');

    expect(upcomingReminders(initialProgress, daily, oct(18, 9))[0].id).toBe('daily:2026-10-19'); // 8 am has passed
    const done = state({ logs: { pushup: [log('a', '2026-10-18')] } });
    expect(upcomingReminders(done, daily, oct(18, 7))[0].id).toBe('daily:2026-10-19');
  });

  it("names the planned workout on later days, and orders everything by time", () => {
    const planned = { ...streaking, workoutPlan: { focus: ['legs' as const], length: 'standard' as const, at: '2026-10-01T00:00:00.000Z' } };
    const r = upcomingReminders(planned, { streak: true, dailyHour: 20 }, oct(17, 9));
    expect(r.slice(0, 4).map((x) => x.id)).toEqual(['daily:2026-10-17', 'streak@18:2026-10-18', 'daily:2026-10-18', 'streak@22:2026-10-18']);
    expect(r[2].body).toBe('Today: Legs. Open Ascent to start.');
  });
});
