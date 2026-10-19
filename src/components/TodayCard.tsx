import { useMemo, useState, type CSSProperties } from 'react';
import { ArrowRight, ClipboardList, Clock, Flame, Pencil, Play, Trophy } from 'lucide-react';
import { treeById, trees, type TreeId } from '../data';
import { splits } from '../data/splits';
import { dayCalories, DEFAULT_BODY_KG, workoutCalories } from '../lib/calories';
import { formatWork, pct } from '../lib/format';
import { bodyWeightOn, daySummaries, dayTotals, type DaySummary } from '../lib/history';
import { navigate, skillHref, toHash } from '../lib/router';
import { focusTitle, generateWorkout, LENGTHS, minutesByLength, sameFocus, sortFocus, type WorkoutLength } from '../lib/workout';
import { loadActiveWorkout, saveActiveWorkout, snapshot, workoutProgress, type ActiveWorkout } from '../state/activeWorkout';
import { localDay, type WorkoutPlan } from '../state/progress';
import { useProgress } from '../state/ProgressContext';
import { useToast } from './Toast';

/**
 * Home's main widget, driven by your workout plan: set one up, today's
 * workout from it, the workout in progress, or "Great Job!" once you've trained.
 */
export function TodayCard() {
  const { state, setWorkoutPlan } = useProgress();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const plan = state.workoutPlan;
  const today = localDay();
  const summary = useMemo(() => daySummaries(state).get(today), [state, today]);
  const active = useMemo(() => loadActiveWorkout(), []);

  if (!plan || editing) {
    return (
      <PlanEditor
        plan={plan}
        onSave={(next) => {
          setWorkoutPlan(next);
          setEditing(false);
          toast(
            plan ? 'Workout plan updated' : 'Workout plan saved',
            `${focusTitle(next.focus)}, about ${generateWorkout(state, next.focus, next.length).minutes} min`,
          );
        }}
        onCancel={plan ? () => setEditing(false) : undefined}
      />
    );
  }
  if (active) return <InProgress active={active} />;
  // A morning mobility routine isn't the day's workout, so it doesn't count as done here.
  const trained = !!summary && (summary.sessions.length > 0 || summary.workouts.some((w) => w.finishedAt && !w.routine));
  if (summary && trained) return <GreatJob summary={summary} plan={plan} onEdit={() => setEditing(true)} />;
  return <PlannedWorkout plan={plan} onEdit={() => setEditing(true)} />;
}

function FocusDots({ focus }: { focus: TreeId[] }) {
  return (
    <span className="split-btn__dots" aria-hidden>
      {focus.map((t) => (
        <span key={t} className="dot" style={{ '--tree': treeById[t].color } as CSSProperties} />
      ))}
    </span>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="link-btn" onClick={onClick}>
      <Pencil size={13} aria-hidden /> Edit plan
    </button>
  );
}

// ---------- Setting up or adjusting the plan ----------

function PlanEditor({
  plan,
  onSave,
  onCancel,
}: {
  plan: WorkoutPlan | null;
  onSave: (plan: Omit<WorkoutPlan, 'at'>) => void;
  onCancel?: () => void;
}) {
  const { state } = useProgress();
  const [focus, setFocus] = useState<TreeId[]>(plan?.focus ?? []);
  const [length, setLength] = useState<WorkoutLength>(plan?.length ?? 'standard');
  const preview = useMemo(() => (focus.length ? generateWorkout(state, focus, length) : null), [state, focus, length]);
  const minutes = useMemo(() => (focus.length ? minutesByLength(state, focus) : null), [state, focus]);
  const toggle = (t: TreeId) => setFocus((f) => sortFocus(f.includes(t) ? f.filter((x) => x !== t) : [...f, t]));

  return (
    <section className="card today-card plan-editor" aria-labelledby="plan-editor-title">
      <div className="card__head">
        <h2 id="plan-editor-title">
          <ClipboardList size={18} aria-hidden /> {plan ? 'Adjust your workout plan' : 'Set up your workout plan'}
        </h2>
      </div>
      <p className="muted small">
        Pick the areas you're training. Every day, Home builds your workout from them at your current level, with
        a warm-up and cooldown. You can change your plan any time.
      </p>
      <div className="builder__row">
        <span className="eyebrow">Popular plans</span>
        <div className="chips" role="group" aria-label="Popular plans">
          {splits.map((s) => (
            <button
              key={s.id}
              className="chip chip--toggle"
              aria-pressed={sameFocus(s.focus, focus)}
              onClick={() => setFocus(sortFocus(s.focus))}
            >
              <FocusDots focus={s.focus} />
              {s.name}
            </button>
          ))}
        </div>
      </div>
      <div className="builder__row">
        <span className="eyebrow">Or pick areas</span>
        <div className="chips" role="group" aria-label="Areas to train">
          {trees.map((t) => (
            <button
              key={t.id}
              className="chip chip--toggle"
              aria-pressed={focus.includes(t.id)}
              style={{ '--tree': t.color } as CSSProperties}
              onClick={() => toggle(t.id)}
            >
              <span className="dot" aria-hidden />
              {t.name}
            </button>
          ))}
        </div>
      </div>
      <div className="builder__row">
        <span className="eyebrow">Workout length</span>
        <div className="segmented" role="group" aria-label="Workout length">
          {(Object.keys(LENGTHS) as WorkoutLength[]).map((l) => (
            <button key={l} aria-pressed={length === l} onClick={() => setLength(l)}>
              {LENGTHS[l].label} {minutes && <span className="muted">~{minutes[l]} min</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="today-card__footer">
        <span className="muted small">
          {preview
            ? `${focusTitle(preview.focus)}: about ${preview.minutes} min, ${preview.main.length} exercises at your level.`
            : 'Pick at least one area.'}
        </span>
        <div className="button-row">
          {onCancel && (
            <button className="btn" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button className="btn btn--primary" disabled={!focus.length} onClick={() => onSave({ focus: sortFocus(focus), length })}>
            Save plan
          </button>
        </div>
      </div>
    </section>
  );
}

// ---------- Today's workout from the plan ----------

function PlannedWorkout({ plan, onEdit }: { plan: WorkoutPlan; onEdit: () => void }) {
  const { state, recordWorkout } = useProgress();
  const workout = useMemo(() => generateWorkout(state, plan.focus, plan.length), [state, plan]);
  const kcal = workoutCalories(workout, bodyWeightOn(state) ?? DEFAULT_BODY_KG);

  const start = () => {
    const started = snapshot(workout);
    saveActiveWorkout(started);
    recordWorkout({ title: focusTitle(workout.focus), focus: workout.focus, length: workout.length, startedAt: started.startedAt });
    navigate('#/workout');
  };

  return (
    <section className="card today-card" aria-labelledby="today-title">
      <div className="card__head">
        <span className="eyebrow">Today's workout</span>
        <EditButton onClick={onEdit} />
      </div>
      <h2 id="today-title" className="today-card__title">
        <FocusDots focus={workout.focus} />
        {focusTitle(workout.focus)}
      </h2>
      <p className="today-card__meta muted small">
        <span>
          <Clock size={14} aria-hidden /> About {workout.minutes} min
        </span>
        <span>
          <Flame size={14} aria-hidden /> About {kcal} kcal
        </span>
        <span>
          {workout.warmup.length} warm-up drills · {workout.main.length} exercises · {workout.cooldown.length} stretches
        </span>
      </p>
      <ol className="today-list">
        {workout.main.map((m) => (
          <li key={m.exercise.id}>
            <a href={skillHref(m.exercise.id)} style={{ '--tree': treeById[m.exercise.tree].color } as CSSProperties}>
              <span className="dot" aria-hidden />
              <span className="today-list__name">{m.exercise.name}</span>
              <span className="today-list__plan">
                {formatWork(m.exercise, m.plan, state.units)}
                {m.exercise.target.perSide ? ' each side' : ''}
              </span>
            </a>
          </li>
        ))}
      </ol>
      <div className="button-row">
        <button className="btn btn--primary btn--lg" onClick={start}>
          <Play size={18} aria-hidden /> Start workout
        </button>
        <a className="btn btn--lg" href={toHash({ name: 'workout', focus: plan.focus })}>
          Customize
        </a>
      </div>
    </section>
  );
}

// ---------- In progress ----------

function InProgress({ active }: { active: ActiveWorkout }) {
  const { done, total } = workoutProgress(active);
  return (
    <section className="card today-card" aria-labelledby="today-title">
      <div className="card__head">
        <span className="eyebrow">Today's workout · in progress</span>
      </div>
      <h2 id="today-title" className="today-card__title">
        <FocusDots focus={active.focus} />
        {focusTitle(active.focus)}
      </h2>
      <p className="muted small">
        {done} of {total} done. Pick up where you left off.
      </p>
      <span className="meter" aria-hidden>
        <span style={{ width: pct(total ? done / total : 0) }} />
      </span>
      <div className="button-row">
        <a href="#/workout" className="btn btn--primary btn--lg">
          Continue workout <ArrowRight size={16} aria-hidden />
        </a>
      </div>
    </section>
  );
}

// ---------- Done for today ----------

function GreatJob({ summary, plan, onEdit }: { summary: DaySummary; plan: WorkoutPlan; onEdit: () => void }) {
  const { state } = useProgress();
  const totals = dayTotals(summary);
  const kcal = dayCalories(summary, bodyWeightOn(state, summary.day) ?? DEFAULT_BODY_KG);
  const what = totals.finished.length ? `You finished ${totals.finished.join(' & ')} today.` : 'You trained today.';

  return (
    <section className="card today-card today-card--done" aria-labelledby="today-title">
      <div className="card__head">
        <span className="eyebrow">Today's workout</span>
        <EditButton onClick={onEdit} />
      </div>
      <div className="today-card__done">
        <span className="today-card__badge" aria-hidden>
          <Trophy size={22} />
        </span>
        <div>
          <h2 id="today-title" className="today-card__title">
            Great Job!
          </h2>
          <p className="muted small">
            {what} Rest up. Your next {focusTitle(plan.focus)} workout will be ready tomorrow.
          </p>
        </div>
      </div>
      <dl className="today-stats">
        <div>
          <dt>Calories</dt>
          <dd>
            {kcal} <span>kcal</span>
          </dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>{totals.minutes !== null ? <>{totals.minutes} <span>min</span></> : '–'}</dd>
        </div>
        <div>
          <dt>Exercises</dt>
          <dd>{totals.exercises}</dd>
        </div>
        <div>
          <dt>{totals.reps ? 'Reps' : 'Sets'}</dt>
          <dd>{totals.reps || totals.sets}</dd>
        </div>
      </dl>
      <a href={toHash({ name: 'history', day: summary.day })} className="link-btn">
        See today in History <ArrowRight size={14} aria-hidden />
      </a>
    </section>
  );
}
