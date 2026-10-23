import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { Activity } from 'lucide-react';
import { formatDay } from '@ascent/core/lib/format';
import { addDays, daysBetween, TREND_DAYS, weightSeries, weightStats, weightTrend, type WeightPoint } from '@ascent/core/lib/history';
import { toUnits, type Units } from '@ascent/core/lib/units';
import { localDay } from '@ascent/core/state/progress';
import { useProgress } from '../state/ProgressContext';

const RANGES = [
  { days: 30, label: '30 days' },
  { days: 90, label: '3 months' },
  { days: 365, label: '1 year' },
  { days: 0, label: 'All' },
];

const M = { top: 12, right: 12, bottom: 24, left: 46 };
const TREND_H = 220;
const CHANGE_H = 120;
/** Weigh-ins closer together than this (px, on average) would merge into a smear: draw them as a thin line instead. */
const MIN_DOT_SPACING = 5;

/** The dot size for `count` weigh-ins across `plotW` px, or null to draw them as a line. */
function dotRadius(count: number, plotW: number): number | null {
  // A lone weigh-in is the whole story so far: draw it prominently.
  if (count === 1) return 6;
  const spacing = plotW / count;
  return spacing < MIN_DOT_SPACING ? null : Math.min(5, Math.max(2.5, spacing / 3));
}

/** An element's width, kept current, so the charts draw at real size and their text stays legible on phones. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Keep the last real width if it's briefly hidden (0), so the charts don't flicker out.
    const observer = new ResizeObserver(([entry]) => {
      const w = Math.floor(entry.contentRect.width);
      if (w > 0) setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Round tick values (steps of 1, 2, 2.5 or 5 × a power of ten) covering lo–hi. */
function niceTicks(lo: number, hi: number, count = 4): number[] {
  const raw = (hi - lo || 1) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  const ticks: number[] = [];
  for (let v = Math.floor(lo / step) * step; v < hi + step - 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
/** Axis labels: ticks can be a quarter apart (178.25), which `fmt` would round. */
const tickFmt = (n: number) => String(Math.round(n * 100) / 100);

/** Body weight over a chosen period: every weigh-in, the 7-day trend, and how much it changed each time. */
export function WeightFluctuation() {
  const { state } = useProgress();
  const units = state.units;
  const today = localDay();
  const [range, setRange] = useState(90);
  const [active, setActive] = useState<number | null>(null);
  const [bodyRef, width] = useWidth<HTMLDivElement>();

  const all = useMemo(() => weightTrend(weightSeries(state)), [state]);
  // The period never starts before your first weigh-in, so a few days of them fill the chart
  // instead of huddling at the right edge of three empty months.
  const first = all[0]?.day ?? today;
  const from = range ? addDays(today, 1 - range) : first;
  const start = from < first ? first : from;
  const points = all.filter((p) => p.day >= start && p.day <= today);

  // A weigh-in just logged for a day before the period widens it, so its point shows.
  const newest = useMemo(
    () => Object.entries(state.weight).reduce<{ day: string; at: string } | null>((a, [day, w]) => (a && a.at >= w.at ? a : { day, at: w.at }), null),
    [state.weight],
  );
  const seen = useRef(newest?.at);
  useEffect(() => {
    if (!newest || newest.at === seen.current) return;
    seen.current = newest.at;
    const covers = (days: number) => !days || newest.day >= addDays(today, 1 - days);
    setRange((r) => (covers(r) ? r : RANGES.find((x) => covers(x.days))!.days));
  }, [newest, today]);
  const stats = weightStats(points);
  const goal = state.weightGoal ? toUnits(state.weightGoal.kg, units) : null;

  const u = (kg: number) => toUnits(kg, units);
  const signed = (kg: number) => {
    const v = toUnits(Math.abs(kg), units);
    return `${v === 0 ? '±' : kg > 0 ? '+' : '−'}${fmt(v)} ${units}`;
  };

  // Time runs left to right across the whole period, so gaps between weigh-ins show as gaps.
  // A period of a single day (one weigh-in, "All") sits in the middle.
  const plotW = Math.max(0, width - M.left - M.right);
  const span = daysBetween(start, today);
  const x = (day: string) => M.left + (span > 0 ? (plotW * daysBetween(start, day)) / span : plotW / 2);
  const dotR = dotRadius(points.length, plotW);
  const hasChanges = points.some((p) => p.change !== null);
  const nearest = (e: PointerEvent<SVGElement>) => {
    const px = e.clientX - e.currentTarget.getBoundingClientRect().left;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p.day) - px) < Math.abs(x(points[best].day) - px)) best = i;
    });
    setActive(best);
  };
  const shown = active !== null && active < points.length ? points[active] : null;

  return (
    <section className="card weight-fluct" aria-labelledby="weight-fluct-title">
      <div className="card__head">
        <h2 id="weight-fluct-title">
          <Activity size={18} aria-hidden /> Weight fluctuation
        </h2>
        <div className="segmented" role="group" aria-label="Period">
          {RANGES.map((r) => (
            <button
              key={r.days}
              aria-pressed={range === r.days}
              onClick={() => {
                setRange(r.days);
                setActive(null);
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={bodyRef} className="weight-fluct__body">
        {!all.length ? (
          <p className="muted small">Log your weight (below) to start your chart, then keep logging to see how it moves.</p>
        ) : !stats ? (
          <p className="muted small">No weigh-ins in this period. Pick a longer one.</p>
        ) : (
          <>
            <dl className="weight-fluct__stats">
              {points.length === 1 ? (
                <div>
                  <dt>Weight</dt>
                  <dd>
                    {fmt(u(points[0].kg))} {units}
                  </dd>
                  <span>on {formatDay(points[0].day, { month: 'short', day: 'numeric' })}</span>
                </div>
              ) : (
                <div>
                  <dt>Change</dt>
                  <dd>{signed(stats.change)}</dd>
                  <span>since {formatDay(points[0].day, { month: 'short', day: 'numeric' })}</span>
                </div>
              )}
              <div>
                <dt>Low – high</dt>
                <dd>
                  {stats.low.kg === stats.high.kg ? fmt(u(stats.low.kg)) : `${fmt(u(stats.low.kg))}–${fmt(u(stats.high.kg))}`} {units}
                </dd>
                <span>
                  {points.length === 1 ? '1 weigh-in' : `a ${fmt(u(stats.high.kg - stats.low.kg))} ${units} range`}
                </span>
              </div>
              <div>
                <dt>Typical swing</dt>
                <dd>{stats.typicalSwing === null ? '–' : `±${fmt(u(stats.typicalSwing))} ${units}`}</dd>
                <span>{stats.typicalSwing === null ? 'log again to compare' : 'between weigh-ins'}</span>
              </div>
              <div>
                <dt>Biggest swing</dt>
                <dd>{stats.biggest ? signed(stats.biggest.change!) : '–'}</dd>
                <span>
                  {stats.biggest ? `on ${formatDay(stats.biggest.day, { month: 'short', day: 'numeric' })}` : 'log again to compare'}
                </span>
              </div>
            </dl>

            {width > 0 && (
              <div className="weight-fluct__charts" onPointerLeave={() => setActive(null)}>
                <div className="viz-legend small">
                  <strong>Weight</strong>
                  <span>
                    <span className={`viz-key ${dotR === null ? 'viz-key--raw' : 'viz-key--dot'}`} aria-hidden />{' '}
                    {points.length === 1 ? 'Weigh-in' : 'Weigh-ins'}
                  </span>
                  {points.length > 1 && (
                    <span>
                      <span className="viz-key viz-key--line" aria-hidden /> {TREND_DAYS}-day average
                    </span>
                  )}
                  {goal !== null && (
                    <span>
                      <span className="viz-key viz-key--goal" aria-hidden /> Goal
                    </span>
                  )}
                </div>
                <TrendChart
                  points={points}
                  from={start}
                  to={today}
                  width={width}
                  x={x}
                  u={u}
                  goal={goal}
                  dotR={dotR}
                  units={units}
                  shown={shown}
                  onMove={nearest}
                />

                {hasChanges ? (
                  <>
                    <div className="viz-legend small">
                      <strong>Change from the weigh-in before</strong>
                      <span>
                        <span className="viz-key viz-key--up" aria-hidden /> Up
                      </span>
                      <span>
                        <span className="viz-key viz-key--down" aria-hidden /> Down
                      </span>
                    </div>
                    <ChangeChart points={points} from={start} to={today} width={width} x={x} u={u} units={units} shown={shown} onMove={nearest} />
                  </>
                ) : (
                  <p className="muted small weight-fluct__note">
                    Log your weight again on another day to see how much it changes between weigh-ins.
                  </p>
                )}

                {shown && (
                  <div
                    className="viz-tooltip"
                    role="status"
                    // Beside the crosshair (on whichever side has room), so it never covers the point.
                    style={{
                      left: x(shown.day),
                      transform: x(shown.day) > width / 2 ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)',
                    }}
                  >
                    <strong>{formatDay(shown.day, { weekday: 'short', month: 'short', day: 'numeric' })}</strong>
                    <span>
                      Weight <b>{fmt(u(shown.kg))} {units}</b>
                    </span>
                    <span>
                      {TREND_DAYS}-day average <b>{fmt(u(shown.avg))} {units}</b>
                    </span>
                    {shown.change !== null && (
                      <span>
                        Change <b>{signed(shown.change)}</b>
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            <details className="weight-fluct__table">
              <summary className="small">Show as a table</summary>
              <table className="small">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Weight</th>
                    <th scope="col">Change</th>
                    <th scope="col">{TREND_DAYS}-day avg</th>
                  </tr>
                </thead>
                <tbody>
                  {[...points].reverse().map((p) => (
                    <tr key={p.day}>
                      <td>{formatDay(p.day, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td>
                        {fmt(u(p.kg))} {units}
                      </td>
                      <td>{p.change === null ? '–' : signed(p.change)}</td>
                      <td>
                        {fmt(u(p.avg))} {units}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        )}
      </div>
    </section>
  );
}

interface ChartProps {
  points: WeightPoint[];
  /** The period shown, first and last day. */
  from: string;
  to: string;
  width: number;
  x: (day: string) => number;
  u: (kg: number) => number;
  units: Units;
  shown: WeightPoint | null;
  onMove: (e: PointerEvent<SVGElement>) => void;
}

/** Up to four date labels spread evenly across the period, kept inside the chart at its edges. */
function DateAxis({ from, to, x, y, width }: { from: string; to: string; x: (day: string) => number; y: number; width: number }) {
  const days = [...new Set([0, 1, 2, 3].map((i) => addDays(from, Math.round((daysBetween(from, to) * i) / 3))))];
  const anchor = (px: number) => (px < M.left + 30 ? 'start' : px > width - M.right - 30 ? 'end' : 'middle');
  return (
    <>
      {days.map((d) => (
        <text key={d} className="viz-tick" x={x(d)} y={y} textAnchor={anchor(x(d))}>
          {formatDay(d, { month: 'short', day: 'numeric' })}
        </text>
      ))}
    </>
  );
}

function TrendChart({ points, from, to, width, x, u, goal, dotR, units, shown, onMove }: ChartProps & { goal: number | null; dotR: number | null }) {
  const values = points.flatMap((p) => [u(p.kg), u(p.avg)]).concat(goal ?? []);
  const pad = Math.max(0.5, (Math.max(...values) - Math.min(...values)) * 0.1);
  const ticks = niceTicks(Math.min(...values) - pad, Math.max(...values) + pad);
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const y = (v: number) => M.top + (TREND_H - M.top - M.bottom) * (1 - (v - lo) / (hi - lo));
  const line = (key: 'kg' | 'avg') => points.map((p, i) => `${i ? 'L' : 'M'}${x(p.day)},${y(u(p[key]))}`).join(' ');
  const last = points[points.length - 1];

  return (
    <svg
      width={width}
      height={TREND_H}
      className="viz"
      role="img"
      aria-label={`Body weight: ${points.length} weigh-ins from ${u(points[0].kg)} to ${u(last.kg)} ${units}, ${TREND_DAYS}-day average now ${u(last.avg)} ${units}.`}
      onPointerMove={onMove}
      onPointerDown={onMove}
    >
      {ticks.map((t) => (
        <g key={t}>
          <line className="viz-grid" x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} />
          <text className="viz-tick" x={M.left - 8} y={y(t) + 4} textAnchor="end">
            {tickFmt(t)}
          </text>
        </g>
      ))}
      {goal !== null && (
        <>
          <line className="viz-goal" x1={M.left} x2={width - M.right} y1={y(goal)} y2={y(goal)} />
          <text className="viz-label" x={width - M.right} y={y(goal) - 6} textAnchor="end">
            Goal {fmt(goal)} {units}
          </text>
        </>
      )}
      {shown && <line className="viz-crosshair" x1={x(shown.day)} x2={x(shown.day)} y1={M.top} y2={TREND_H - M.bottom} />}
      {dotR === null && <path className="viz-raw" d={line('kg')} />}
      <path className="viz-trend" d={line('avg')} />
      {/* Weigh-ins sit on top of the average line, so each one stays visible where they meet. */}
      {dotR !== null &&
        points.map((p) => (
          <circle
            key={p.day}
            className={`viz-dot${points.length === 1 ? ' is-active' : ''}`}
            cx={x(p.day)}
            cy={y(u(p.kg))}
            r={dotR}
          />
        ))}
      {shown && <circle className="viz-dot is-active" cx={x(shown.day)} cy={y(u(shown.kg))} r={Math.max(6, (dotR ?? 0) + 1.5)} />}
      <text className="viz-label" x={Math.min(x(last.day) + 8, width - M.right)} y={y(u(last.avg)) - 8} textAnchor="end">
        {fmt(u(last.avg))} {units}
      </text>
      <DateAxis from={from} to={to} x={x} y={TREND_H - 4} width={width} />
    </svg>
  );
}

/** Bar from the zero line, rounded on its outer end. */
function barPath(cx: number, y0: number, y1: number, w: number) {
  const h = Math.abs(y1 - y0);
  const r = Math.min(4, w / 2, h);
  const l = cx - w / 2;
  const R = cx + w / 2;
  return y1 < y0
    ? `M${l},${y0} V${y1 + r} Q${l},${y1} ${l + r},${y1} H${R - r} Q${R},${y1} ${R},${y1 + r} V${y0} Z`
    : `M${l},${y0} V${y1 - r} Q${l},${y1} ${l + r},${y1} H${R - r} Q${R},${y1} ${R},${y1 - r} V${y0} Z`;
}

function ChangeChart({ points, from, to, width, x, u, units, shown, onMove }: ChartProps) {
  const changes = points.filter((p) => p.change !== null);
  const biggest = Math.max(0.5, ...changes.map((p) => Math.abs(u(p.change!))));
  const top = niceTicks(0, biggest, 2).find((t) => t >= biggest) ?? biggest;
  const mid = M.top + (CHANGE_H - M.top - M.bottom) / 2;
  const half = (CHANGE_H - M.top - M.bottom) / 2;
  const y = (v: number) => mid - (v / top) * half;
  // As wide as the closest pair of weigh-ins allows, so bars for back-to-back days don't overlap.
  const gaps = points.slice(1).map((p, i) => x(p.day) - x(points[i].day));
  const bw = Math.max(2, Math.min(18, Math.min(width - M.left - M.right, ...gaps) * 0.6));
  const ups = changes.filter((p) => p.change! > 0).length;

  return (
    <svg
      width={width}
      height={CHANGE_H}
      className="viz"
      role="img"
      aria-label={`Change between weigh-ins: up ${ups} times and down ${changes.length - ups} times, by up to ${fmt(biggest)} ${units}.`}
      onPointerMove={onMove}
      onPointerDown={onMove}
    >
      {[top, -top].map((t) => (
        <g key={t}>
          <line className="viz-grid" x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} />
          <text className="viz-tick" x={M.left - 8} y={y(t) + 4} textAnchor="end">
            {t > 0 ? '+' : '−'}
            {tickFmt(Math.abs(t))}
          </text>
        </g>
      ))}
      <line className="viz-zero" x1={M.left} x2={width - M.right} y1={mid} y2={mid} />
      <text className="viz-tick" x={M.left - 8} y={mid + 4} textAnchor="end">
        0
      </text>
      {shown && <line className="viz-crosshair" x1={x(shown.day)} x2={x(shown.day)} y1={M.top} y2={CHANGE_H - M.bottom} />}
      {changes.map((p) => {
        const v = u(p.change!);
        if (v === 0) return null;
        return (
          <path
            key={p.day}
            className={`viz-bar ${v > 0 ? 'is-up' : 'is-down'}${shown?.day === p.day ? ' is-active' : ''}`}
            d={barPath(x(p.day), mid, y(v), bw)}
          />
        );
      })}
      <DateAxis from={from} to={to} x={x} y={CHANGE_H - 4} width={width} />
    </svg>
  );
}
