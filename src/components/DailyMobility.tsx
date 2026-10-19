import { useMemo, type CSSProperties } from 'react';
import { ArrowRight, Check, Play, Sunrise } from 'lucide-react';
import { routineMinutes, routines } from '../data/routines';
import { unlockSpeech } from '../lib/announcer';
import { navigate } from '../lib/router';
import { routineDaysInLast, routinesDoneOn, suggestRoutine } from '../lib/routines';
import { localDay } from '../state/progress';
import { useProgress } from '../state/ProgressContext';

let autostart: string | null = null;

/** Opens a routine and starts playing it straight away (call from a tap, so the announcer can speak). */
export function startRoutine(id: string) {
  unlockSpeech();
  autostart = id;
  navigate({ name: 'mobility', routine: id });
}

/** True once if `id` was opened with `startRoutine`. */
export function takeAutostart(id: string): boolean {
  const yes = autostart === id;
  autostart = null;
  return yes;
}

/** Home's daily mobility card: today's suggested routine, one tap to start, and the others to pick from. */
export function DailyMobility() {
  const { state } = useProgress();
  const today = localDay();
  const done = useMemo(() => new Set(routinesDoneOn(state, today)), [state, today]);
  const pick = useMemo(() => suggestRoutine(state), [state]);
  const week = useMemo(() => routineDaysInLast(state, 7), [state]);

  return (
    <section className="card mobility-card" aria-labelledby="mobility-title">
      <div className="card__head">
        <h2 id="mobility-title">
          <Sunrise size={18} aria-hidden /> Daily mobility
        </h2>
        <a href="#/mobility" className="link-btn">
          All routines <ArrowRight size={14} aria-hidden />
        </a>
      </div>
      <div className="mobility-pick" style={{ '--routine': pick.routine.color } as CSSProperties}>
        <span className="mobility-pick__text">
          <span className="eyebrow">{done.size ? 'Done for today. Up for another?' : "Today's pick"}</span>
          <a href={`#/mobility/${pick.routine.id}`} className="mobility-pick__name">
            {pick.routine.name}
          </a>
          <span className="muted small">
            {routineMinutes(pick.routine)} min · {pick.reason}
          </span>
        </span>
        <button className="btn btn--primary" onClick={() => startRoutine(pick.routine.id)}>
          <Play size={16} aria-hidden /> Start
        </button>
      </div>
      <ul className="mobility-chips" aria-label="Mobility routines">
        {routines.map((r) => (
          <li key={r.id}>
            <a
              href={`#/mobility/${r.id}`}
              className={`mobility-chip${done.has(r.id) ? ' is-done' : ''}`}
              style={{ '--routine': r.color } as CSSProperties}
              aria-label={`${r.name}, ${routineMinutes(r)} minutes${done.has(r.id) ? ', done today' : ''}`}
            >
              {done.has(r.id) ? <Check size={13} aria-hidden /> : <span className="dot" aria-hidden />}
              {r.short}
              <span className="mobility-chip__min">{routineMinutes(r)} min</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="muted small">
        {week
          ? `Done on ${week} of the last 7 days. Short follow-along routines to loosen up and start the day.`
          : 'Short follow-along routines (5–10 minutes) to loosen up your spine, shoulders, hips and legs and start the day.'}
      </p>
    </section>
  );
}
