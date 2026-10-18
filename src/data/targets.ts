import type { Target } from './types';

export const reps = (sets: number, value: number): Target => ({ sets, value, unit: 'reps' });

export const repsEach = (sets: number, value: number): Target => ({
  sets,
  value,
  unit: 'reps',
  perSide: true,
});

export const hold = (sets: number, seconds: number): Target => ({
  sets,
  value: seconds,
  unit: 'seconds',
});

export const holdEach = (sets: number, seconds: number): Target => ({
  sets,
  value: seconds,
  unit: 'seconds',
  perSide: true,
});
