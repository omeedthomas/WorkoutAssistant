import type { CSSProperties } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { treeById } from '@ascent/core/data';
import type { Growth } from '@ascent/core/lib/history';
import { skillHref } from '../lib/router';
import { toUnits, type Units } from '@ascent/core/lib/units';

const W = 96;
const H = 28;
const PAD = 5;

/** A tiny trend line: one series, its latest value marked. A single session is just that mark, at the end. */
function Sparkline({ values, label }: { values: number[]; label: string }) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const x = (i: number) => (values.length === 1 ? W - PAD : PAD + ((W - 2 * PAD) * i) / (values.length - 1));
  const y = (v: number) => (hi === lo ? H / 2 : PAD + (H - 2 * PAD) * (1 - (v - lo) / (hi - lo)));
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const last = values.length - 1;
  return (
    <svg className="sparkline" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={label}>
      {values.length === 1 ? (
        <line className="sparkline__start" x1={PAD} x2={W - PAD} y1={H / 2} y2={H / 2} />
      ) : (
        <polyline points={points} />
      )}
      <circle cx={x(last)} cy={y(values[last])} r={4} />
    </svg>
  );
}

/** A value in its own unit: "+25 lb" added, "45s" held, or a plain rep count. */
function describe(g: Growth, v: number, units: Units, sign = false): string {
  const n = Math.round(v * 10) / 10;
  const s = sign && n > 0 ? '+' : '';
  if (g.weighted) return `${sign ? s : '+'}${n} ${units}`;
  return g.exercise.target.unit === 'seconds' ? `${s}${n}s` : `${s}${n}`;
}

/** How your reps (or holds, or added weight) have moved on recently trained exercises. */
export function GrowthList({ items, units }: { items: Growth[]; units: Units }) {
  return (
    <ul className="growth-list">
      {items.map((g) => {
        const values = g.points.map((p) => (g.weighted ? toUnits(p.value, units) : p.value));
        const first = values[0];
        const latest = values[values.length - 1];
        const change = latest - first;
        const single = values.length === 1;
        const reps = !g.weighted && g.exercise.target.unit === 'reps' ? (latest === 1 ? ' rep' : ' reps') : '';
        return (
          <li key={g.exercise.id}>
            <a
              href={skillHref(g.exercise.id)}
              className="growth"
              style={{ '--tree': treeById[g.exercise.tree].color } as CSSProperties}
            >
              <span className="growth__main">
                <span className="growth__name">{g.exercise.name}</span>
                <span className="growth__range">
                  {single ? (
                    <>
                      {describe(g, latest, units)}
                      {reps} · first session
                    </>
                  ) : (
                    <>
                      {describe(g, first, units)} → {describe(g, latest, units)}
                      {reps} over {values.length} sessions
                    </>
                  )}
                </span>
              </span>
              <Sparkline
                values={values}
                label={
                  single
                    ? `${g.exercise.name}: first session, ${values[0]}${g.weighted ? ` ${units} added` : ''}`
                    : `${g.exercise.name}: ${values.join(', ')}${g.weighted ? ` ${units} added` : ''} over your last ${values.length} sessions`
                }
              />
              <span className={`growth__delta${change > 0 ? ' is-up' : change < 0 ? ' is-down' : ''}`}>
                {change > 0 ? <ArrowUp size={12} aria-hidden /> : change < 0 ? <ArrowDown size={12} aria-hidden /> : null}
                {single ? 'New' : change === 0 ? 'Same' : describe(g, change, units, true)}
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
