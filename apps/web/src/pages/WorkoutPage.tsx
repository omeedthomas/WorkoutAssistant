import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowDown, Check, ClipboardList, Clock, Flame, Lightbulb, Pencil, Play, Sparkles, Undo2, Wrench } from 'lucide-react';
import { DrillRow } from '../components/DrillRow';
import { GuidedWorkout } from '../components/GuidedWorkout';
import { NumberStepper } from '../components/NumberStepper';
import { planKindLabel } from '../components/SessionPlanCard';
import { SetsEditor } from '../components/SetsEditor';
import { feedbackItems, NO_FEEDBACK, WorkoutFeedback, type Feedback } from '../components/WorkoutFeedback';
import { useToast } from '../components/Toast';
import { exerciseById, treeById, trees, type Exercise, type TreeId } from '@ascent/core/data';
import { drillById, type Drill } from '@ascent/core/data/drills';
import { equipmentById } from '@ascent/core/data/equipment';
import { splitById, splits, weeklyPlans, type Split } from '@ascent/core/data/splits';
import { unlockSpeech } from '../lib/announcer';
import { activeCalories, DEFAULT_BODY_KG, workoutCalories } from '@ascent/core/lib/calories';
import { formatWork, pct } from '@ascent/core/lib/format';
import { meetsTarget } from '@ascent/core/lib/graph';
import { firstStepOf, guidedSteps, type GuidedStep } from '@ascent/core/lib/guided';
import { bodyWeightOn } from '@ascent/core/lib/history';
import { restFor, type PlanKind } from '@ascent/core/lib/progression';
import { setValues, workFromSets } from '@ascent/core/lib/sets';
import type { Work } from '@ascent/core/state/progress';
import { navigate, skillHref, toHash } from '../lib/router';
import { fromUnits, loadStepKg, toUnits } from '@ascent/core/lib/units';
import {
  BLOCKS,
  focusTitle,
  generateWorkout,
  LENGTHS,
  minutesByLength,
  sameFocus,
  sortFocus,
  suggestSplit,
  type Block,
  type WorkoutLength,
} from '@ascent/core/lib/workout';
import { easierStep, feedbackFor, useActiveWorkout, workoutProgress, type ActiveExercise } from '../state/activeWorkout';
import { useProgress } from '../state/ProgressContext';

const PREFS_KEY = 'ascent:workout-prefs';

interface Prefs {
  day: string;
  focus: TreeId[];
  length: WorkoutLength;
}

function loadPrefs(): Partial<Prefs> {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Partial<Prefs>;
  } catch {
    return {};
  }
}


function scrollToTop() {
  document.querySelector('.app-main')?.scrollTo({ top: 0, behavior: 'smooth' });
}

/** What a main-work row needs, whether it comes from a preview or a started workout. */
interface MainItem {
  exercise: Exercise;
  sets: number;
  value: number;
  addedKg?: number;
  kind: PlanKind;
  reason: string;
  why: string;
  block: Block;
  /** How to set up without the usual equipment. */
  setup?: string;
  logged?: ActiveExercise['logged'];
  swappedFrom?: ActiveExercise['swappedFrom'];
}

export function WorkoutPage({ focus: routeFocus }: { focus?: TreeId[] }) {
  const { state, recordWorkout } = useProgress();
  const session = useActiveWorkout();
  const suggestion = useMemo(() => suggestSplit(state), [state]);

  const [prefs, setPrefs] = useState<Prefs>(() => {
    const stored = loadPrefs();
    const day = new Date().toDateString();
    const storedFocus = stored.day === day && stored.focus?.length ? stored.focus.filter((t) => t in treeById) : null;
    const plan = state.workoutPlan;
    const focus = routeFocus ?? storedFocus ?? plan?.focus ?? suggestion.split.focus;
    // Building your planned workout uses the plan's length; anything else keeps the last length you picked.
    const length = plan && sameFocus(focus, plan.focus) ? plan.length : stored.length && stored.length in LENGTHS ? stored.length : 'standard';
    return { day, focus: sortFocus(focus), length };
  });
  const plan = state.workoutPlan;

  // Follow links like #/workout/legs,core from elsewhere in the app.
  useEffect(() => {
    if (routeFocus) setPrefs((p) => (sameFocus(routeFocus, p.focus) ? p : { ...p, focus: sortFocus(routeFocus) }));
  }, [routeFocus]);

  // Remember the choice for today and keep the URL shareable.
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // not persisted; fine
    }
    if (!session.active) {
      const hash = toHash({ name: 'workout', focus: prefs.focus });
      if (window.location.hash !== hash) navigate(hash, { replace: true });
    }
  }, [prefs, session.active]);

  const workout = useMemo(
    () => (prefs.focus.length ? generateWorkout(state, prefs.focus, prefs.length) : null),
    [state, prefs.focus, prefs.length],
  );
  const minutes = useMemo(() => (prefs.focus.length ? minutesByLength(state, prefs.focus) : null), [state, prefs.focus]);
  const bodyKg = bodyWeightOn(state);

  if (session.active) return <ActiveWorkoutView session={session} />;

  const setFocus = (focus: TreeId[]) => setPrefs((p) => ({ ...p, focus: sortFocus(focus) }));
  const toggleTree = (t: TreeId) =>
    setFocus(prefs.focus.includes(t) ? prefs.focus.filter((f) => f !== t) : [...prefs.focus, t]);

  return (
    <div className="page workout-page">
      <header className="page-header">
        <h1>Today's workout</h1>
        <p className="muted">
          Choose what to train and get a full session: a warm-up for those areas, the exercises you're currently
          working on in each tree, and a cooldown.
        </p>
      </header>

      <section className="card builder">
        <h2>What are you training today?</h2>
        <p className="builder__suggestion small">
          <Sparkles size={15} aria-hidden />
          <span>
            <strong>Suggested: {suggestion.split.name}.</strong> {suggestion.reason}
          </span>
        </p>
        {plan && (
          <p className="builder__suggestion small">
            <ClipboardList size={15} aria-hidden />
            <span>
              <strong>Your plan: {focusTitle(plan.focus)}</strong> ({LENGTHS[plan.length].label.toLowerCase()}).{' '}
              {!(sameFocus(plan.focus, prefs.focus) && prefs.length === plan.length) && (
                <button className="link-btn" onClick={() => setPrefs((p) => ({ ...p, focus: plan.focus, length: plan.length }))}>
                  Use it
                </button>
              )}
            </span>
          </p>
        )}
        <div className="split-grid" role="group" aria-label="Training days">
          {splits.map((s) => (
            <SplitButton
              key={s.id}
              split={s}
              selected={sameFocus(s.focus, prefs.focus)}
              suggested={s.id === suggestion.split.id}
              onSelect={() => setFocus(s.focus)}
            />
          ))}
        </div>
        <div className="builder__row">
          <span className="eyebrow">Or pick areas</span>
          <div className="chips" role="group" aria-label="Areas to train">
            {trees.map((t) => (
              <button
                key={t.id}
                className="chip chip--toggle"
                aria-pressed={prefs.focus.includes(t.id)}
                style={{ '--tree': t.color } as CSSProperties}
                onClick={() => toggleTree(t.id)}
              >
                <span className="dot" aria-hidden />
                {t.name}
              </button>
            ))}
          </div>
        </div>
        <div className="builder__row">
          <span className="eyebrow">Length</span>
          <div className="segmented" role="group" aria-label="Workout length">
            {(Object.keys(LENGTHS) as WorkoutLength[]).map((l) => (
              <button key={l} aria-pressed={prefs.length === l} onClick={() => setPrefs((p) => ({ ...p, length: l }))}>
                {LENGTHS[l].label} {minutes && <span className="muted">~{minutes[l]} min</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="builder__row">
          <span className="eyebrow">Equipment</span>
          <p className="small muted">
            <Wrench size={14} aria-hidden />{' '}
            {state.equipment
              ? state.equipment.have.length
                ? state.equipment.have.map((e) => equipmentById[e].name).join(', ')
                : 'None: floor, wall and household stand-ins'
              : 'Not set, so every exercise is included'}{' '}
            · <a href="#/equipment">{state.equipment ? 'Change' : 'Set up'}</a>
          </p>
        </div>
      </section>

      {workout ? (
        <>
          <div className="card workout-summary">
            <div>
              <h2>{focusTitle(workout.focus)}</h2>
              <p className="muted small">
                <Clock size={14} aria-hidden /> About {workout.minutes} min · {workout.warmup.length} warm-up drills ·{' '}
                {workout.main.length} exercises · {workout.cooldown.length} cooldown stretches
              </p>
              <p className="muted small" title={bodyKg ? undefined : 'Estimated for an average body weight. Log yours in History for a better estimate.'}>
                <Flame size={14} aria-hidden /> About {workoutCalories(workout, bodyKg ?? DEFAULT_BODY_KG)} kcal
                {!bodyKg && (
                  <>
                    {' '}
                    · <a href="#/history">add your weight</a> for a better estimate
                  </>
                )}
              </p>
            </div>
            <button
              className="btn btn--primary btn--lg"
              onClick={() => {
                unlockSpeech();
                const started = session.start(workout);
                recordWorkout({
                  title: focusTitle(workout.focus),
                  focus: workout.focus,
                  length: workout.length,
                  startedAt: started.startedAt,
                });
                scrollToTop();
              }}
            >
              <Play size={18} aria-hidden /> Start workout
            </button>
          </div>
          <WorkoutBody
            warmup={workout.warmup}
            cooldown={workout.cooldown}
            notes={workout.notes}
            main={workout.main.map((m) => ({
              exercise: m.exercise,
              sets: m.plan.sets,
              value: m.plan.value,
              addedKg: m.plan.addedKg,
              setup: m.setup,
              kind: m.plan.kind,
              reason: m.plan.reason,
              why: m.why,
              block: m.block,
            }))}
          />
        </>
      ) : (
        <p className="card muted">Pick at least one area to build a workout.</p>
      )}

      <WeeklyPlans
        onPick={(focus) => {
          setFocus(focus);
          scrollToTop();
        }}
      />
    </div>
  );
}

function SplitButton({
  split,
  selected,
  suggested,
  onSelect,
}: {
  split: Split;
  selected: boolean;
  suggested: boolean;
  onSelect: () => void;
}) {
  return (
    <button className="split-btn" aria-pressed={selected} onClick={onSelect}>
      <span className="split-btn__dots" aria-hidden>
        {split.focus.map((t) => (
          <span key={t} className="dot" style={{ '--tree': treeById[t].color } as CSSProperties} />
        ))}
      </span>
      <span className="split-btn__name">
        {split.name}
        {suggested && <span className="tag tag--goal">Suggested</span>}
      </span>
      <span className="split-btn__desc">{split.description}</span>
    </button>
  );
}

// ---------- Workout body (shared by preview and active workout) ----------

interface ActiveControls {
  checked: string[];
  toggleDrill: (id: string) => void;
  markLogged: (exerciseId: string, logged: ActiveExercise['logged']) => void;
  /** Opens the guided workout at this drill or exercise. */
  playFrom: (kind: GuidedStep['kind'], id: string) => void;
  /** The step to switch to if this exercise is too hard (see core's `easierStep`). */
  easier: (exerciseId: string) => Exercise | null;
  swap: (fromId: string, toId: string) => void;
}

function WorkoutBody({
  warmup,
  main,
  cooldown,
  notes,
  active,
}: {
  warmup: Drill[];
  main: MainItem[];
  cooldown: Drill[];
  notes: string[];
  active?: ActiveControls;
}) {
  const minutes = (list: Drill[]) => Math.max(1, Math.round(list.reduce((s, d) => s + d.seconds, 0) / 60));
  const blocks = (Object.keys(BLOCKS) as Block[]).filter((b) => main.some((m) => m.block === b));

  return (
    <div className="workout-body">
      {notes.length > 0 && (
        <ul className="workout-notes">
          {notes.map((n) => (
            <li key={n}>
              <Lightbulb size={14} aria-hidden /> {n}
            </li>
          ))}
        </ul>
      )}

      <WorkoutSection step={1} title="Warm-up" meta={`about ${minutes(warmup)} min`}>
        <ul className="drill-list">
          {warmup.map((d) => (
            <DrillRow
              key={d.id}
              drill={d}
              done={active?.checked.includes(d.id)}
              onToggle={active && (() => active.toggleDrill(d.id))}
              onPlay={active && (() => active.playFrom('drill', d.id))}
            />
          ))}
        </ul>
      </WorkoutSection>

      <WorkoutSection step={2} title="Main work" meta={`${main.length} exercises at your level`}>
        {blocks.map((b) => (
          <div key={b} className="workout-block">
            <div className="workout-block__head">
              <h4>{BLOCKS[b].label}</h4>
              <span className="muted small">{BLOCKS[b].note}</span>
            </div>
            {main
              .filter((m) => m.block === b)
              .map((m) => (
                <ExerciseCard key={m.exercise.id} item={m} index={main.indexOf(m) + 1} active={active} />
              ))}
          </div>
        ))}
      </WorkoutSection>

      <WorkoutSection step={3} title="Cooldown" meta={`about ${minutes(cooldown)} min`}>
        <ul className="drill-list">
          {cooldown.map((d) => (
            <DrillRow
              key={d.id}
              drill={d}
              done={active?.checked.includes(d.id)}
              onToggle={active && (() => active.toggleDrill(d.id))}
              onPlay={active && (() => active.playFrom('drill', d.id))}
            />
          ))}
        </ul>
      </WorkoutSection>
    </div>
  );
}

function WorkoutSection({ step, title, meta, children }: { step: number; title: string; meta: string; children: ReactNode }) {
  return (
    <section className="workout-section">
      <header className="workout-section__head">
        <span className="workout-section__step">{step}</span>
        <h3>{title}</h3>
        <span className="muted small">{meta}</span>
      </header>
      {children}
    </section>
  );
}

function ExerciseCard({ item, index, active }: { item: MainItem; index: number; active?: ActiveControls }) {
  const { state } = useProgress();
  const ex = item.exercise;
  const tree = treeById[ex.tree];
  const each = ex.target.perSide ? ' each side' : '';

  return (
    <article className={`wx-card${item.logged ? ' is-done' : ''}`} style={{ '--tree': tree.color } as CSSProperties}>
      <div className="wx-card__head">
        <span className="wx-card__index" aria-hidden>
          {item.logged ? <Check size={16} /> : index}
        </span>
        <div className="wx-card__title">
          <span className="wx-card__meta">
            <span className="dot" aria-hidden />
            {tree.name} · L{ex.level} · {item.why}
          </span>
          <a href={skillHref(ex.id)} className="wx-card__name">
            {ex.name}
          </a>
        </div>
        <span className={`tag plan-tag plan-tag--${item.kind}`}>{planKindLabel[item.kind]}</span>
        {active && (
          <button className="icon-btn icon-btn--sm" aria-label={`Follow along from ${ex.name}`} title="Follow along from here" onClick={() => active.playFrom('exercise', ex.id)}>
            <Play size={16} aria-hidden />
          </button>
        )}
      </div>
      <div className="wx-card__plan">
        <strong>
          {formatWork(ex, item, state.units)}
          {each}
        </strong>
        <span className="muted small">
          <Clock size={13} aria-hidden /> Rest {restFor(ex)}
        </span>
      </div>
      <p className="wx-card__reason">{item.reason}</p>
      {item.setup && (
        <p className="wx-card__setup">
          <Wrench size={14} aria-hidden /> {item.setup}
        </p>
      )}
      {active && <ActiveLogger item={item} active={active} />}
    </article>
  );
}

function ActiveLogger({ item, active }: { item: MainItem; active: ActiveControls }) {
  const { state, log, editLog, deleteLog, master } = useProgress();
  const toast = useToast();
  const ex = item.exercise;
  const unit = ex.target.unit;
  const units = state.units;
  const weighted = ex.target.addedKg !== undefined;
  /** Logging numbers other than the plan ('new'), or correcting what was logged ('logged'). */
  const [editing, setEditing] = useState<'new' | 'logged' | null>(null);
  /** Each set's reps (or seconds). */
  const [sets, setSets] = useState(() => Array.from({ length: item.sets }, () => item.value));
  const [added, setAdded] = useState(toUnits(item.addedKg ?? 0, units));
  const adjusted = workFromSets(sets, weighted ? fromUnits(added, units) : undefined);
  const planned = { sets: item.sets, value: item.value, ...(weighted && { addedKg: item.addedKg ?? 0 }) };

  const record = (done: Work) => {
    const logId = log(ex.id, done, planned);
    active.markLogged(ex.id, { ...done, logId });
    setEditing(null);
  };

  const correct = (logId: string) => {
    editLog(ex.id, logId, adjusted);
    active.markLogged(ex.id, { ...adjusted, logId });
    setEditing(null);
  };

  if (item.logged && editing !== 'logged') {
    const logged = item.logged;
    const hitMastery = !state.mastered[ex.id] && meetsTarget(ex, logged);
    return (
      <div className="wx-logged">
        <span className="wx-logged__text">
          <Check size={15} aria-hidden /> Logged {formatWork(ex, logged, units)}
        </span>
        <button
          className="link-btn"
          onClick={() => {
            setSets(setValues(logged));
            setAdded(toUnits(logged.addedKg ?? 0, units));
            setEditing('logged');
          }}
        >
          <Pencil size={13} aria-hidden /> Edit
        </button>
        <button
          className="link-btn"
          onClick={() => {
            deleteLog(ex.id, item.logged!.logId);
            active.markLogged(ex.id, undefined);
          }}
        >
          <Undo2 size={13} aria-hidden /> Undo
        </button>
        {hitMastery && (
          <div className="callout callout--success wx-logged__mastery">
            <span>
              <strong>Mastery target hit!</strong>
            </span>
            <button
              className="btn btn--primary btn--sm"
              onClick={() => {
                const unlocked = master(ex.id, { includeAncestors: true });
                toast(`${ex.name} mastered`, unlocked.length ? `Unlocked ${unlocked.map((u) => u.name).join(', ')}` : undefined);
              }}
            >
              Mark mastered
            </button>
          </div>
        )}
      </div>
    );
  }

  const logId = item.logged?.logId;
  const easier = active.easier(ex.id);
  const original = item.swappedFrom && exerciseById[item.swappedFrom.exerciseId];
  return (
    <div className="wx-actions">
      {editing ? (
        <>
          <SetsEditor
            values={sets}
            onChange={(v) => setSets(v.filter((x) => x !== undefined))}
            unit={unit}
            resizable
          />
          {weighted && (
            <NumberStepper
              label={`Added weight (${units})`}
              value={added}
              onChange={setAdded}
              step={toUnits(loadStepKg(units), units)}
              min={0}
              max={units === 'lb' ? 400 : 180}
            />
          )}
          <div className="wx-actions__row">
            <button className="btn btn--sm" onClick={() => setEditing(null)}>
              Cancel
            </button>
            {editing === 'logged' && logId ? (
              <button className="btn btn--primary btn--sm" onClick={() => correct(logId)}>
                Save {formatWork(ex, adjusted, units)}
              </button>
            ) : (
              <button className="btn btn--primary btn--sm" onClick={() => record(adjusted)}>
                Log {formatWork(ex, adjusted, units)}
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="wx-actions__row">
          <button className="btn btn--primary btn--sm" onClick={() => record(planned)}>
            <Check size={15} aria-hidden /> Done as planned
          </button>
          <button className="btn btn--sm" onClick={() => setEditing('new')}>
            Log each set
          </button>
          {easier && (
            <button className="btn btn--sm" onClick={() => active.swap(ex.id, easier.id)} title={`Switch to ${easier.name} for this workout`}>
              <ArrowDown size={15} aria-hidden /> Easier: {easier.name}
            </button>
          )}
          {original && (
            <button className="btn btn--sm" onClick={() => active.swap(ex.id, original.id)}>
              <Undo2 size={15} aria-hidden /> Back to {original.name}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Active workout ----------

function ActiveWorkoutView({ session }: { session: ReturnType<typeof useActiveWorkout> }) {
  const toast = useToast();
  const { state, finishWorkout, removeWorkout, rateLog } = useProgress();
  const active = session.active!;
  const { done, total } = workoutProgress(active);
  const logged = active.main.filter((m) => m.logged).length;
  const kcal = activeCalories(active, bodyWeightOn(state) ?? DEFAULT_BODY_KG);
  /** Finishing from the list asks how it was first (the guided player asks on its last screen). */
  const [asking, setAsking] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(NO_FEEDBACK);
  /** Keeps the question (which grows as you answer) in view above the floating footer. */
  const showFeedback = () =>
    requestAnimationFrame(() => document.querySelector('.workout-feedback')?.scrollIntoView({ behavior: 'smooth', block: 'end' }));

  const finish = ({ rating, adjust }: Feedback) => {
    const changes = feedbackFor(active, rating, adjust);
    for (const c of changes) rateLog(c.exerciseId, c.logId, c.feel);
    finishWorkout(active.startedAt, kcal, rating ?? undefined);
    session.end();
    const adjusted = changes.length
      ? ` ${changes.length} exercise${changes.length === 1 ? '' : 's'} will be ${rating === 'hard' ? 'easier' : 'harder'} next time.`
      : '';
    toast(
      done === total ? 'Workout complete!' : 'Workout finished',
      `${logged} of ${active.main.length} exercises logged, about ${kcal} kcal burned. Your next plans have been updated.${adjusted}`,
    );
    scrollToTop();
  };

  const discard = () => {
    if (!window.confirm('Discard this workout? Anything you already logged stays in your history.')) return;
    // Nothing done: forget the workout entirely. Otherwise keep it, unfinished, alongside what was logged.
    if (logged === 0) removeWorkout(active.startedAt);
    session.end();
  };

  const main: MainItem[] = active.main.map((m) => ({ ...m, exercise: exerciseById[m.exerciseId] }));
  const steps = useMemo(() => guidedSteps(active, state.units), [active.startedAt, state.units]); // eslint-disable-line react-hooks/exhaustive-deps
  const follow = (position?: number) => {
    unlockSpeech();
    session.setGuided(true, position);
    scrollToTop();
  };

  if (active.guided) {
    return (
      <div className="page workout-page workout-page--active page--guided">
        <header className="page-header">
          <span className="eyebrow">Workout in progress</span>
          <h1>{focusTitle(active.focus)}</h1>
        </header>
        {/* Switching an exercise changes the steps: start the player again, on the new exercise. */}
        <GuidedWorkout key={active.main.map((m) => m.exerciseId).join()} session={session} kcal={kcal} onFinish={finish} />
      </div>
    );
  }

  return (
    <div className="page workout-page workout-page--active">
      <header className="page-header">
        <span className="eyebrow">Workout in progress</span>
        <h1>{focusTitle(active.focus)}</h1>
        <div className="workout-progress">
          <span className="meter" aria-hidden>
            <span style={{ width: pct(total ? done / total : 0) }} />
          </span>
          <span className="small">
            {done} / {total} done · about {kcal} kcal
          </span>
        </div>
      </header>

      <div className="card guided-resume">
        <span>
          <strong>Follow along</strong>
          <span className="muted small">
            One exercise at a time with a looping demo, timers, rest breaks and an announcer that counts you in.
          </span>
        </span>
        <button className="btn btn--primary" onClick={() => follow()}>
          <Play size={16} aria-hidden /> {active.position > 0 ? 'Resume' : 'Start'} guided workout
        </button>
      </div>

      <WorkoutBody
        warmup={active.warmup.map((id) => drillById[id])}
        cooldown={active.cooldown.map((id) => drillById[id])}
        notes={active.notes}
        main={main}
        active={{
          checked: active.checked,
          toggleDrill: session.toggleDrill,
          markLogged: session.markLogged,
          playFrom: (kind, id) => follow(firstStepOf(steps, kind, id)),
          easier: (id) => easierStep(active, id, state.equipment?.have ?? null),
          swap: (fromId, toId) => session.swap(fromId, toId, state),
        }}
      />

      {asking && (
        <section className="card workout-feedback" aria-label="Finish workout">
          <WorkoutFeedback
            items={feedbackItems(active, state.units)}
            value={feedback}
            onChange={(f) => {
              setFeedback(f);
              if (f.rating !== feedback.rating) showFeedback();
            }}
          />
        </section>
      )}

      <div className="workout-footer">
        {asking ? (
          <button className="btn" onClick={() => setAsking(false)}>
            Back
          </button>
        ) : (
          <button className="btn" onClick={discard}>
            Discard
          </button>
        )}
        <button
          className="btn btn--primary"
          onClick={() => {
            if (asking) return finish(feedback);
            setAsking(true);
            showFeedback();
          }}
        >
          <Check size={16} aria-hidden /> Finish workout
        </button>
      </div>
    </div>
  );
}

// ---------- Weekly plans ----------

function WeeklyPlans({ onPick }: { onPick: (focus: TreeId[]) => void }) {
  return (
    <section className="card weekly">
      <h2>Plan your week</h2>
      <p className="muted small">
        Training days that group trees which work well together, with rest days in between. Tap a day to build
        that workout.
      </p>
      <div className="weekly-grid">
        {weeklyPlans.map((w) => (
          <div key={w.days} className="weekly-plan">
            <h3>{w.name}</h3>
            <ol>
              {w.schedule.map((s) => {
                const split = splitById[s.split];
                return (
                  <li key={s.day}>
                    <span className="weekly-plan__day">{s.day}</span>
                    <button className="weekly-plan__split" onClick={() => onPick(split.focus)}>
                      <span className="split-btn__dots" aria-hidden>
                        {split.focus.map((t) => (
                          <span key={t} className="dot" style={{ '--tree': treeById[t].color } as CSSProperties} />
                        ))}
                      </span>
                      {split.name}
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="muted small">{w.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
