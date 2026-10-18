import { useState } from 'react';
import type { Exercise } from '../data';
import { formatDate, formatSet } from '../lib/format';
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

/** Reps (or seconds) per set over recent sessions, against the mastery target. */
export function HistoryChart({ ex, logs }: { ex: Exercise; logs: LogEntry[] }) {
  const [active, setActive] = useState<number | null>(null);
  const data = logs.slice(0, MAX_SESSIONS).reverse();
  if (data.length < 2) return null;

  const { unit, value: goal } = ex.target;
  const max = Math.max(goal, ...data.map((d) => d.value));
  const y = (v: number) => TOP + (H - TOP - BOTTOM) * (1 - v / max);
  const slot = W / data.length;
  const barW = Math.min(22, slot - 4);
  const shown = active ?? data.length - 1;
  const current = data[shown];
  const word = unit === 'seconds' ? 'seconds' : 'reps';

  return (
    <figure className="history-chart">
      <figcaption className="history-chart__readout" aria-live="polite">
        <span>{formatDate(current.date)}</span>
        <strong>{formatSet(current.sets, current.value, unit)}</strong>
        {current.planned && (
          <span className="muted">planned {formatSet(current.planned.sets, current.planned.value, unit)}</span>
        )}
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${word} per set over your last ${data.length} sessions: ${data.map((d) => d.value).join(', ')}. Goal ${goal}.`}
        onPointerLeave={() => setActive(null)}
      >
        <line className="history-chart__goal" x1={0} x2={W} y1={y(goal)} y2={y(goal)} />
        <text className="history-chart__goal-label" x={W} y={y(goal) - 5} textAnchor="end">
          Goal {goal}
          {unit === 'seconds' ? 's' : ''}
        </text>
        {data.map((d, i) => {
          const top = y(d.value);
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
