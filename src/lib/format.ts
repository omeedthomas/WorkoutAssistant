import type { Exercise, Target, Unit } from '../data';
import type { Work } from '../state/progress';
import { formatAdded, snapLoad, type Units } from './units';

export function unitLabel(unit: Unit, value = 2): string {
  if (unit === 'seconds') return 'sec';
  return value === 1 ? 'rep' : 'reps';
}

/** "3 × 10 reps", "3 × 30s each side", "3 × 5 reps at +45 lb". */
export function formatTarget(t: Target, opts: { short?: boolean; units?: Units } = {}): string {
  const value = t.unit === 'seconds' ? `${t.value}s` : `${t.value}`;
  const each = t.perSide ? (opts.short ? ' /side' : ' each side') : '';
  const load = t.addedKg === undefined ? '' : formatAdded(snapLoad(t.addedKg, opts.units ?? 'kg', 'up'), opts.units ?? 'kg');
  if (opts.short) return `${t.sets}×${value}${each}${load && ` ${load}`}`;
  const unit = t.unit === 'seconds' ? '' : ` ${unitLabel(t.unit, t.value)}`;
  return `${t.sets} × ${value}${unit}${each}${load && ` at ${load}`}`;
}

export function formatSet(sets: number, value: number, unit: Unit): string {
  return unit === 'seconds' ? `${sets} × ${value}s` : `${sets} × ${value} ${unitLabel(unit, value)}`;
}

/** A session of `ex`: "3 × 8 reps", or "3 × 5 reps at +25 lb" on weighted exercises. */
export function formatWork(ex: Exercise, w: Work, units: Units): string {
  const base = formatSet(w.sets, w.value, ex.target.unit);
  return ex.target.addedKg === undefined ? base : `${base} at ${formatAdded(w.addedKg ?? 0, units)}`;
}

/** A local day ("2026-10-18") as a Date at local midnight. */
export function dayToDate(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "Saturday, Oct 18" by default. */
export function formatDay(
  day: string,
  opts: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' },
): string {
  return new Intl.DateTimeFormat(undefined, opts).format(dayToDate(day));
}

const dateFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const days = Math.round(
    (startOfDay(today).getTime() - startOfDay(d).getTime()) / 86_400_000,
  );
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return dateFmt.format(d);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Time left: "2d 5h", "5h 12m", or "12m 30s" in the last hour. */
export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86_400);
  const h = Math.floor((s % 86_400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}
