import type { Target, Unit } from '../data';

export function unitLabel(unit: Unit, value = 2): string {
  if (unit === 'seconds') return 'sec';
  return value === 1 ? 'rep' : 'reps';
}

/** "3 × 10 reps", "3 × 30s each side". */
export function formatTarget(t: Target, opts: { short?: boolean } = {}): string {
  const value = t.unit === 'seconds' ? `${t.value}s` : `${t.value}`;
  const each = t.perSide ? (opts.short ? ' /side' : ' each side') : '';
  if (opts.short) return `${t.sets}×${value}${each}`;
  const unit = t.unit === 'seconds' ? '' : ` ${unitLabel(t.unit, t.value)}`;
  return `${t.sets} × ${value}${unit}${each}`;
}

export function formatSet(sets: number, value: number, unit: Unit): string {
  return unit === 'seconds' ? `${sets} × ${value}s` : `${sets} × ${value} ${unitLabel(unit, value)}`;
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

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}
