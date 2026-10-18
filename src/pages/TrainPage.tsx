import { useMemo, type CSSProperties } from 'react';
import { ArrowRight, ArrowUp, Dumbbell, Flame, Plus, Star, Target, Trophy, X } from 'lucide-react';
import { planKindLabel } from '../components/SessionPlanCard';
import { exerciseById, exercises, featuredGoals, treeById, trees } from '../data';
import { formatDate, formatSet, formatTarget, pct } from '../lib/format';
import { goalProgress, nextStepsToward, statusOf, treeStats } from '../lib/graph';
import { isLevelUp } from '../lib/progression';
import { skillHref, toHash } from '../lib/router';
import { generateWorkout, suggestSplit, type WorkoutExercise } from '../lib/workout';
import { splits } from '../data/splits';
import { loadActiveWorkout, workoutProgress } from '../state/activeWorkout';
import { focusTitle } from './WorkoutPage';
import { MAX_GOALS } from '../state/progress';
import { useProgress } from '../state/ProgressContext';

export function TrainPage() {
  const { state } = useProgress();

  const stats = useMemo(() => {
    const mastered = Object.keys(state.mastered).length;
    const ready = exercises.filter((e) => statusOf(e.id, state.mastered) === 'available').length;
    const allLogs = Object.values(state.logs).flat();
    const days = new Set(allLogs.map((l) => new Date(l.date).toDateString())).size;
    return { mastered, ready, sessions: allLogs.length, days };
  }, [state]);

  return (
    <div className="page">
      {!state.onboarded && <Welcome />}

      <section className="stat-row" aria-label="Your progress">
        <Stat label="Skills mastered" value={stats.mastered} sub={`of ${exercises.length}`} />
        <Stat label="Ready to train" value={stats.ready} sub="unlocked" />
        <Stat label="Sessions logged" value={stats.sessions} />
        <Stat label="Days trained" value={stats.days} />
      </section>

      <div className="train-grid">
        <TodayWorkoutCard />

        <GoalsCard />

        <section className="card">
          <div className="card__head">
            <h2>Tree progress</h2>
            <a href="#/trees/all" className="link-btn">
              View all <ArrowRight size={14} aria-hidden />
            </a>
          </div>
          <ul className="tree-meters">
            {trees.map((t) => {
              const s = treeStats(t.id, state.mastered);
              return (
                <li key={t.id}>
                  <a
                    href={`#/trees/${t.id}`}
                    className="tree-meter"
                    style={{ '--tree': t.color } as CSSProperties}
                  >
                    <span className="tree-meter__label">
                      <span className="dot" aria-hidden />
                      {t.name}
                    </span>
                    <span className="tree-meter__value">
                      {s.done}/{s.total}
                    </span>
                    <span
                      className="meter meter--tree"
                      role="meter"
                      aria-label={`${t.name} progress`}
                      aria-valuemin={0}
                      aria-valuemax={s.total}
                      aria-valuenow={s.done}
                    >
                      <span style={{ width: pct(s.done / s.total) }} />
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>

        <RecentActivity />
      </div>
    </div>
  );
}

function Welcome() {
  const { setOnboarded } = useProgress();
  return (
    <section className="welcome">
      <div>
        <h1>Build real strength, one progression at a time.</h1>
        <p>
          Every skill here is a ladder. Wall push-ups lead to knee push-ups, then full push-ups, and branches
          connect into bigger skills like the muscle-up, handstand and planche. Start wherever you are.
        </p>
      </div>
      <div className="welcome__actions">
        <a href="#/start" className="btn btn--primary btn--lg">
          <Target size={18} aria-hidden /> Set my starting point
        </a>
        <button className="btn btn--lg" onClick={setOnboarded}>
          I'm starting from scratch
        </button>
      </div>
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="stat">
      <span className="stat__label">{label}</span>
      <span className="stat__value">
        {value}
        {sub && <span className="stat__sub"> {sub}</span>}
      </span>
    </div>
  );
}

/** Home card: today's suggested training day and a preview of its main work. */
function TodayWorkoutCard() {
  const { state } = useProgress();
  const active = useMemo(() => loadActiveWorkout(), []);
  const suggestion = useMemo(() => suggestSplit(state), [state]);
  const preview = useMemo(() => generateWorkout(state, suggestion.split.focus, 'standard'), [state, suggestion]);

  if (active) {
    const { done, total } = workoutProgress(active);
    return (
      <section className="card card--session">
        <div className="card__head">
          <h2>
            <Dumbbell size={18} aria-hidden /> Today's workout
          </h2>
        </div>
        <p>
          <strong>{focusTitle(active.focus)}</strong> is in progress: {done} of {total} done.
        </p>
        <span className="meter" aria-hidden>
          <span style={{ width: pct(total ? done / total : 0) }} />
        </span>
        <a href="#/workout" className="btn btn--primary">
          Continue workout <ArrowRight size={16} aria-hidden />
        </a>
      </section>
    );
  }

  return (
    <section className="card card--session">
      <div className="card__head">
        <h2>
          <Dumbbell size={18} aria-hidden /> Today's workout
        </h2>
        <span className="muted small">About {preview.minutes} min</span>
      </div>
      <div className="today-split">
        <span className="eyebrow">Suggested training day</span>
        <strong className="today-split__name">{suggestion.split.name}</strong>
        <p className="muted small">{suggestion.reason}</p>
      </div>
      <p className="small muted">Warm-up, then these exercises at your level, then a cooldown:</p>
      <ol className="session-list">
        {preview.main.map((m) => (
          <SessionItem key={m.exercise.id} item={m} />
        ))}
      </ol>
      <a href={toHash({ name: 'workout', focus: suggestion.split.focus })} className="btn btn--primary">
        Build this workout <ArrowRight size={16} aria-hidden />
      </a>
      <div className="today-split__others">
        <span className="eyebrow">Or train something else</span>
        <div className="chips">
          {splits
            .filter((s) => s.id !== suggestion.split.id)
            .map((s) => (
              <a key={s.id} className="chip" href={toHash({ name: 'workout', focus: s.focus })}>
                {s.name}
              </a>
            ))}
        </div>
      </div>
    </section>
  );
}

function SessionItem({ item }: { item: WorkoutExercise }) {
  const { state } = useProgress();
  const { exercise: ex, plan, why } = item;
  const last = state.logs[ex.id]?.[0];
  const unit = ex.target.unit;
  const each = ex.target.perSide ? ' /side' : '';
  return (
    <li>
      <a
        href={skillHref(ex.id)}
        className="session-item"
        style={{ '--tree': treeById[ex.tree].color } as CSSProperties}
      >
        <span className="session-item__main">
          <span className="session-item__meta">
            <span className="dot" aria-hidden />
            {treeById[ex.tree].name} · L{ex.level}
            <span className={`tag${why.startsWith('Toward') || why === 'Your goal' ? ' tag--goal' : ''}`}>{why}</span>
          </span>
          <span className="session-item__name">{ex.name}</span>
          <span className="session-item__best">
            {last ? `Last ${formatSet(last.sets, last.value, unit)} · ` : ''}Goal {formatTarget(ex.target, { short: true })}
          </span>
        </span>
        <span className="session-item__plan">
          <span className="session-item__target">
            {plan.sets}×{plan.value}
            {unit === 'seconds' ? 's' : ''}
            {each}
          </span>
          <span className={`session-item__kind plan-kind--${plan.kind}`}>
            {isLevelUp(plan) && <ArrowUp size={11} aria-hidden />}
            {planKindLabel[plan.kind]}
          </span>
        </span>
        <ArrowRight size={16} className="session-item__go" aria-hidden />
      </a>
    </li>
  );
}

function GoalsCard() {
  const { state, toggleGoal } = useProgress();
  const suggestions = featuredGoals.filter((g) => !state.goals.includes(g) && !state.mastered[g]);
  const full = state.goals.length >= MAX_GOALS;

  return (
    <section className="card">
      <div className="card__head">
        <h2>
          <Star size={18} aria-hidden /> Goals
        </h2>
      </div>
      {state.goals.length === 0 && (
        <p className="muted small">
          Pick a skill to aim for. Its whole path gets highlighted in the trees and prioritised in your sessions.
        </p>
      )}
      <ul className="goal-list">
        {state.goals.map((g) => {
          const ex = exerciseById[g];
          const { done, total } = goalProgress(g, state.mastered);
          const next = nextStepsToward(g, state.mastered).slice(0, 3);
          const complete = !!state.mastered[g];
          return (
            <li key={g} className="goal" style={{ '--tree': treeById[ex.tree].color } as CSSProperties}>
              <div className="goal__head">
                <a href={skillHref(g)} className="goal__name">
                  {complete && <Trophy size={16} aria-hidden />} {ex.name}
                </a>
                <span className="goal__count">
                  {done}/{total} steps
                </span>
                <button className="icon-btn icon-btn--sm" aria-label={`Remove goal ${ex.name}`} onClick={() => toggleGoal(g)}>
                  <X size={14} />
                </button>
              </div>
              <span className="meter meter--tree" aria-hidden>
                <span style={{ width: pct(done / total) }} />
              </span>
              {complete ? (
                <p className="goal__next">Achieved! Pick a new goal to keep climbing.</p>
              ) : next.length > 0 ? (
                <p className="goal__next">
                  Next:{' '}
                  {next.map((n, i) => (
                    <span key={n.id}>
                      {i > 0 && ', '}
                      <a href={skillHref(n.id)}>{n.name}</a>
                    </span>
                  ))}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
      {suggestions.length > 0 && !full && (
        <>
          <h3 className="eyebrow">{state.goals.length ? 'Add another goal' : 'Popular goals'}</h3>
          <div className="chips">
            {suggestions.slice(0, 8).map((g) => (
              <button
                key={g}
                className="chip chip--add"
                style={{ '--tree': treeById[exerciseById[g].tree].color } as CSSProperties}
                onClick={() => toggleGoal(g)}
              >
                <Plus size={12} aria-hidden />
                {exerciseById[g].name}
              </button>
            ))}
          </div>
          <p className="muted small">Or open any skill in a tree and tap “Set as goal”.</p>
        </>
      )}
    </section>
  );
}

function RecentActivity() {
  const { state } = useProgress();
  const items = useMemo(() => {
    const logs = Object.entries(state.logs).flatMap(([id, list]) =>
      list.map((l) => ({ kind: 'log' as const, id, date: l.date, text: formatSet(l.sets, l.value, exerciseById[id].target.unit) })),
    );
    // Skills mastered together (e.g. a starting point) collapse into one entry.
    const byDate = new Map<string, string[]>();
    for (const [id, date] of Object.entries(state.mastered)) byDate.set(date, [...(byDate.get(date) ?? []), id]);
    const mastered = [...byDate].map(([date, ids]) => {
      const top = ids.reduce((a, b) => (exerciseById[b].level > exerciseById[a].level ? b : a));
      return {
        kind: 'mastered' as const,
        id: top,
        date,
        text: ids.length > 1 ? `Mastered, plus ${ids.length - 1} more` : 'Mastered',
      };
    });
    return [...logs, ...mastered].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  }, [state.logs, state.mastered]);

  return (
    <section className="card">
      <div className="card__head">
        <h2>Recent activity</h2>
      </div>
      {items.length === 0 ? (
        <p className="muted small">Nothing yet. Open a skill and log your first session.</p>
      ) : (
        <ul className="activity">
          {items.map((it, i) => (
            <li key={`${it.kind}-${it.id}-${it.date}-${i}`}>
              <span className={`activity__icon is-${it.kind}`} aria-hidden>
                {it.kind === 'mastered' ? <Trophy size={14} /> : <Flame size={14} />}
              </span>
              <a href={skillHref(it.id)}>{exerciseById[it.id].name}</a>
              <span className="activity__text">{it.text}</span>
              <span className="activity__date">{formatDate(it.date)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
