import { useState } from 'react';
import type { Exercise } from '../data';
import { formatDate, formatWork } from '../lib/format';
import { snapLoad, toUnits, type Units } from '../lib/units';
import type { LogEntry } from '../state/progress';

const W = 320;
const H = 104;
const TOP = 18;
const BOTTOM = 2;
const MAX_SESSIONS = 12;

/** Bar top with 4px rounded corners, flat on the baseline. */
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

/**
 * Reps (or seconds) per set over recent sessions, against the mastery target.
 * Weighted exercises chart the added weight instead, since that's what goes up.
 */
export function HistoryChart({ ex, logs, units }: { ex: Exercise; logs: LogEntry[]; units: Units }) {
  const [active, setActive] = useState<number | null>(null);
  const data = logs.slice(0, MAX_SESSIONS).reverse();
  if (data.length < 2) return null;

  const { unit, addedKg } = ex.target;
  const weighted = addedKg !== undefined;
  const valueOf = (d: LogEntry) => (weighted ? toUnits(d.addedKg ?? 0, units) : d.value);
  const goal = weighted ? toUnits(snapLoad(addedKg, units, 'up'), units) : ex.target.value;
  const max = Math.max(goal, ...data.map(valueOf)) || 1;
  const y = (v: number) => TOP + (H - TOP - BOTTOM) * (1 - v / max);
  const slot = W / data.length;
  const barW = Math.min(22, slot - 4);
  const shown = active ?? data.length - 1;
  const current = data[shown];
  const word = weighted ? `added ${units}` : unit === 'seconds' ? 'seconds' : 'reps';
  const goalLabel = weighted ? `+${goal} ${units}` : `${goal}${unit === 'seconds' ? 's' : ''}`;

  return (
    <figure className="history-chart">
      <figcaption className="history-chart__readout" aria-live="polite">
        <span>{formatDate(current.date)}</span>
        <strong>{formatWork(ex, current, units)}</strong>
        {current.planned && <span className="muted">planned {formatWork(ex, current.planned, units)}</span>}
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${word} per session over your last ${data.length} sessions: ${data.map(valueOf).join(', ')}. Goal ${goalLabel}.`}
        onPointerLeave={() => setActive(null)}
      >
        <line className="history-chart__goal" x1={0} x2={W} y1={y(goal)} y2={y(goal)} />
        <text className="history-chart__goal-label" x={W} y={y(goal) - 5} textAnchor="end">
          Goal {goalLabel}
        </text>
        {data.map((d, i) => {
          const top = y(valueOf(d));
          return (
            <g key={d.id} onPointerEnter={() => setActive(i)} onPointerDown={() => setActive(i)}>
              <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" />
              <path
                className={`history-chart__bar${i === shown ? ' is-active' : ''}`}
                d={barPath(i * slot + (slot - barW) / 2, top, barW, H - BOTTOM - top)}
              />
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
