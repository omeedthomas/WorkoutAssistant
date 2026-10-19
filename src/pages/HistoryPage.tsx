import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { ChevronLeft, ChevronRight, Flame, Scale, Target, Trash, TrendingUp } from 'lucide-react';
import { GrowthList } from '../components/Growth';
import { streakNote, StreakTimer, useNow, useStreak } from '../components/Streak';
import { useToast } from '../components/Toast';
import { WeightFluctuation } from '../components/WeightFluctuation';
import { treeById } from '../data';
import { dayCalories, DEFAULT_BODY_KG, recordCalories, sessionsCalories } from '../lib/calories';
import { formatDay, formatWork, pct } from '../lib/format';
import {
  addDays,
  bodyWeightOn,
  daySummaries,
  growthOf,
  sessionsByWorkout,
  weightGoalProgress,
  weightSeries,
  type DaySession,
  type DaySummary,
} from '../lib/history';
import { navigate, skillHref, toHash } from '../lib/router';
import { formatWeight, fromUnits, toUnits } from '../lib/units';
import { localDay } from '../state/progress';
import { useProgress } from '../state/ProgressContext';

/** A known Sunday, for weekday labels. Weeks start on Sunday. */
const A_SUNDAY = '2023-01-01';

const monthOf = (day: string) => day.slice(0, 7);

export function HistoryPage({ day }: { day?: string }) {
  const { state } = useProgress();
  const today = localDay();
  const selected = day ?? today;
  const [month, setMonth] = useState(monthOf(selected));
  useEffect(() => setMonth(monthOf(selected)), [selected]);

  const summaries = useMemo(() => daySummaries(state), [state]);
  const { streak, urgency } = useStreak();
  const now = useNow(urgency === 'urgent' ? 1000 : 30_000);
  const growth = useMemo(() => growthOf(state, { limit: 8 }), [state]);

  const thisMonth = [...summaries.values()].filter((s) => monthOf(s.day) === monthOf(today));
  const monthKcal = thisMonth.reduce((sum, s) => sum + dayCalories(s, bodyWeightOn(state, s.day) ?? DEFAULT_BODY_KG), 0);

  return (
    <div className="page history-page">
      <header className="page-header">
        <h1>History</h1>
        <p className="muted">Every day you trained, what you did, your body weight, and how your numbers are growing.</p>
      </header>

      <section className="stat-row" aria-label="Your training">
        <Stat label="Current streak" value={streak.days} sub={streak.days === 1 ? 'day' : 'days'} />
        <Stat label="Best streak" value={streak.best} sub={streak.best === 1 ? 'day' : 'days'} />
        <Stat label="Training days this month" value={thisMonth.filter((s) => s.trained).length} />
        <Stat label="Calories this month" value={monthKcal} sub="kcal (est.)" />
      </section>
      <p className="history-page__streak small muted">
        <Flame size={14} aria-hidden /> {streakNote(streak, today)}
        <StreakTimer streak={streak} urgency={urgency} now={now} />
      </p>

      <div className="history-grid">
        <Calendar month={month} setMonth={setMonth} selected={selected} today={today} summaries={summaries} />
        <DayDetail day={selected} today={today} summary={summaries.get(selected)} />
      </div>

      <WeightFluctuation />

      <div className="history-grid">
        <WeightCard />
        <section className="card">
          <div className="card__head">
            <h2>
              <TrendingUp size={18} aria-hidden /> Rep growth
            </h2>
          </div>
          {growth.length ? (
            <GrowthList items={growth} units={state.units} />
          ) : (
            <p className="muted small">Log a session and you'll see your reps here, and how they grow.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="stat">
      <span className="stat__label">{label}</span>
      <span className="stat__value">
        {value.toLocaleString()}
        {sub && <span className="stat__sub"> {sub}</span>}
      </span>
    </div>
  );
}

// ---------- Calendar ----------

function Calendar({
  month,
  setMonth,
  selected,
  today,
  summaries,
}: {
  month: string;
  setMonth: (m: string) => void;
  selected: string;
  today: string;
  summaries: Map<string, DaySummary>;
}) {
  const [y, m] = month.split('-').map(Number);
  const lead = new Date(y, m - 1, 1).getDay();
  const length = new Date(y, m, 0).getDate();
  const days = Array.from({ length }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
  const trainedCount = days.filter((d) => summaries.get(d)?.trained).length;
  const shift = (n: number) => {
    const d = new Date(y, m - 1 + n, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  return (
    <section className="card calendar">
      <div className="card__head">
        <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month">
          <ChevronLeft size={18} />
        </button>
        <h2>{formatDay(`${month}-01`, { month: 'long', year: 'numeric' })}</h2>
        <button className="icon-btn" onClick={() => shift(1)} aria-label="Next month" disabled={month >= monthOf(today)}>
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="calendar__grid">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} className="calendar__weekday" aria-hidden>
            {formatDay(addDays(A_SUNDAY, i), { weekday: 'narrow' })}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`lead-${i}`} />
        ))}
        {days.map((d) => {
          const s = summaries.get(d);
          const trained = !!s?.trained;
          const title = s?.workouts.length
            ? s.workouts.map((w) => w.title).join(' & ')
            : trained
              ? `${s!.sessions.length} exercise${s!.sessions.length === 1 ? '' : 's'}`
              : d > today
                ? ''
                : 'Rest day';
          return (
            <button
              key={d}
              className={[
                'calendar__day',
                trained && 'is-trained',
                s?.weight && 'has-weight',
                d === today && 'is-today',
                d === selected && 'is-selected',
                d > today && 'is-future',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-pressed={d === selected}
              aria-label={`${formatDay(d)}${title ? `: ${title}` : ''}`}
              title={title || undefined}
              onClick={() => navigate(toHash({ name: 'history', day: d }), { replace: true })}
            >
              {Number(d.slice(8))}
            </button>
          );
        })}
      </div>
      <div className="calendar__legend small muted">
        <span>
          <span className="calendar__key is-trained" aria-hidden /> Trained
        </span>
        <span>
          <span className="calendar__key has-weight" aria-hidden /> Weigh-in
        </span>
        <span className="calendar__count">
          {trainedCount} training day{trainedCount === 1 ? '' : 's'}
        </span>
      </div>
    </section>
  );
}

// ---------- Day detail ----------

function SessionList({ sessions }: { sessions: DaySession[] }) {
  const { state } = useProgress();
  return (
    <ul className="day-sessions">
      {sessions.map(({ exercise: ex, log }) => (
        <li key={log.id} style={{ '--tree': treeById[ex.tree].color } as CSSProperties}>
          <span className="dot" aria-hidden />
          <a href={skillHref(ex.id)}>{ex.name}</a>
          <span className="day-sessions__work">
            {formatWork(ex, log, state.units)}
            {ex.target.perSide ? ' each side' : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

function DayDetail({ day, today, summary }: { day: string; today: string; summary?: DaySummary }) {
  const { state } = useProgress();
  const kg = bodyWeightOn(state, day) ?? DEFAULT_BODY_KG;
  const empty = !summary || (!summary.sessions.length && !summary.workouts.length && !summary.weight);

  return (
    <section className="card day-detail" aria-live="polite">
      <div className="card__head">
        <h2>
          {formatDay(day)}
          {day === today && <span className="tag">Today</span>}
        </h2>
        {summary && !empty && dayCalories(summary, kg) > 0 && (
          <span className="day-detail__kcal">
            <Flame size={14} aria-hidden /> About {dayCalories(summary, kg)} kcal
          </span>
        )}
      </div>
      {empty ? (
        <p className="muted small">
          {day > today ? 'Nothing here yet.' : day === today ? 'Nothing logged yet today.' : 'Rest day. Nothing was logged.'}
        </p>
      ) : (
        <DayContents summary={summary!} kg={kg} />
      )}
    </section>
  );
}

function DayContents({ summary, kg }: { summary: DaySummary; kg: number }) {
  const { state } = useProgress();
  const { workouts, other } = sessionsByWorkout(summary);
  return (
    <>
      {workouts.map(({ workout: w, sessions }) => {
        const minutes = w.finishedAt ? Math.round((Date.parse(w.finishedAt) - Date.parse(w.startedAt)) / 60_000) : null;
        const kcal = recordCalories(w, sessions, kg);
        return (
          <div key={w.startedAt} className="day-workout">
            <div className="day-workout__head">
              <span className="split-btn__dots" aria-hidden>
                {w.focus.map((t) => (
                  <span key={t} className="dot" style={{ '--tree': treeById[t].color } as CSSProperties} />
                ))}
              </span>
              <strong>{w.title}</strong>
              <span className="muted small">
                {timeFmt.format(new Date(w.startedAt))}
                {minutes !== null && minutes > 0 && minutes < 300 && ` · ${minutes} min`}
                {kcal > 0 && ` · about ${kcal} kcal`}
              </span>
            </div>
            {sessions.length ? (
              <SessionList sessions={sessions} />
            ) : (
              <p className="muted small">{w.finishedAt ? 'Nothing logged.' : 'Started, not finished.'}</p>
            )}
          </div>
        );
      })}
      {other.length > 0 && (
        <div className="day-workout">
          <div className="day-workout__head">
            <strong>{workouts.length ? 'Other sessions' : 'Sessions'}</strong>
            <span className="muted small">about {sessionsCalories(other, kg)} kcal</span>
          </div>
          <SessionList sessions={other} />
        </div>
      )}
      {summary.weight && (
        <p className="day-detail__weight small">
          <Scale size={14} aria-hidden /> Weighed in at <strong>{formatWeight(summary.weight.kg, state.units)}</strong>
        </p>
      )}
    </>
  );
}

// ---------- Body weight ----------

function WeightCard() {
  const { state, logWeight, deleteWeight, setWeightGoal } = useProgress();
  const toast = useToast();
  const units = state.units;
  const series = weightSeries(state);
  const latest = series[series.length - 1];
  const progress = weightGoalProgress(state);
  const [weightText, setWeightText] = useState(latest ? String(toUnits(latest.kg, units)) : '');
  const [goalText, setGoalText] = useState(state.weightGoal ? String(toUnits(state.weightGoal.kg, units)) : '');
  const loggedToday = !!state.weight[localDay()];

  /** A typed body weight in kg, or null (with a toast) if it isn't plausible. */
  const parse = (text: string): number | null => {
    const kg = fromUnits(Number.parseFloat(text), units);
    if (Number.isFinite(kg) && kg >= 20 && kg <= 400) return kg;
    toast("That doesn't look like a body weight", `Enter it in ${units === 'lb' ? 'pounds' : 'kilograms'}.`);
    return null;
  };

  const saveWeight = (e: FormEvent) => {
    e.preventDefault();
    const kg = parse(weightText);
    if (kg === null) return;
    logWeight(kg);
    toast(loggedToday ? "Today's weight updated" : 'Weight logged', formatWeight(kg, units));
  };

  const saveGoal = (e: FormEvent) => {
    e.preventDefault();
    const kg = parse(goalText);
    if (kg === null) return;
    setWeightGoal(kg);
    toast('Weight goal set', formatWeight(kg, units));
  };

  const remaining = progress ? toUnits(Math.abs(progress.remaining), units) : 0;

  return (
    <section className="card weight-card">
      <div className="card__head">
        <h2>
          <Scale size={18} aria-hidden /> Body weight
        </h2>
        {latest && <span className="muted small">Latest {formatWeight(latest.kg, units)}</span>}
      </div>

      <div className="weight-forms">
        <form className="field-row" onSubmit={saveWeight}>
          <label className="field">
            <span className="field__label">Today's weight ({units})</span>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              value={weightText}
              onChange={(e) => setWeightText(e.target.value)}
              placeholder={units === 'lb' ? 'e.g. 172.5' : 'e.g. 78.2'}
            />
          </label>
          <button className="btn btn--primary" type="submit" disabled={!weightText}>
            {loggedToday ? 'Update' : 'Log'}
          </button>
        </form>
        <form className="field-row" onSubmit={saveGoal}>
          <label className="field">
            <span className="field__label">Goal ({units})</span>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              value={goalText}
              onChange={(e) => setGoalText(e.target.value)}
              placeholder="Target weight"
            />
          </label>
          <button className="btn" type="submit" disabled={!goalText}>
            <Target size={16} aria-hidden /> Set goal
          </button>
        </form>
      </div>

      {state.weightGoal && (
        <div className="weight-goal">
          {progress ? (
            <>
              <p className="small">
                {Math.abs(progress.remaining) < 0.25 ? (
                  <strong>Goal reached!</strong>
                ) : (
                  <>
                    <strong>
                      {remaining} {units} to {progress.remaining > 0 ? 'gain' : 'lose'}
                    </strong>{' '}
                    to reach {formatWeight(progress.goal, units)}
                  </>
                )}{' '}
                <span className="muted">(started at {formatWeight(progress.start, units)})</span>
              </p>
              <span
                className="meter"
                role="meter"
                aria-label="Progress to weight goal"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress.done * 100)}
              >
                <span style={{ width: pct(progress.done) }} />
              </span>
            </>
          ) : (
            <p className="small muted">Goal: {formatWeight(state.weightGoal.kg, units)}. Log your weight to track progress.</p>
          )}
          <button
            className="link-btn"
            onClick={() => {
              setWeightGoal(null);
              setGoalText('');
            }}
          >
            Clear goal
          </button>
        </div>
      )}

      {series.length > 0 && (
        <ul className="weigh-ins" aria-label="Recent weigh-ins">
          {[...series]
            .reverse()
            .slice(0, 6)
            .map((w, i, list) => {
              const prev = list[i + 1];
              const change = prev ? toUnits(w.kg, units) - toUnits(prev.kg, units) : 0;
              return (
                <li key={w.day}>
                  <span className="weigh-ins__date">{formatDay(w.day, { month: 'short', day: 'numeric' })}</span>
                  <strong>{formatWeight(w.kg, units)}</strong>
                  <span className="muted small">
                    {prev && Math.abs(change) >= 0.05 ? `${change > 0 ? '+' : ''}${Math.round(change * 10) / 10}` : ''}
                  </span>
                  <button
                    className="icon-btn icon-btn--sm"
                    aria-label={`Delete weigh-in from ${formatDay(w.day)}`}
                    onClick={() => deleteWeight(w.day)}
                  >
                    <Trash size={14} />
                  </button>
                </li>
              );
            })}
        </ul>
      )}
    </section>
  );
}
