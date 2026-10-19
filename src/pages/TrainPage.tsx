import { useMemo, type CSSProperties } from 'react';
import { ArrowRight, Flame, Target, Trophy, Wrench } from 'lucide-react';
import { GoogleSignInButton } from '../components/Account';
import { DailyMobility } from '../components/DailyMobility';
import { StreakWidget } from '../components/Streak';
import { TodayCard } from '../components/TodayCard';
import { exerciseById, exercises, trees, type TreeDef } from '../data';
import { treeImages } from '../data/treeImages';
import { formatDate, formatTarget, formatWork, pct } from '../lib/format';
import { goalProgress, nextStepsToward, statusOf, treeStats } from '../lib/graph';
import { skillHref, toHash } from '../lib/router';
import { useCloud } from '../state/CloudContext';
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

  // Areas in your plan first, then the rest in the usual order.
  const planned = new Set(state.workoutPlan?.focus ?? []);
  const ordered = [...trees].sort((a, b) => Number(planned.has(b.id)) - Number(planned.has(a.id)));

  return (
    <div className="page home">
      {!state.onboarded && <Welcome />}

      <StreakWidget />

      <TodayCard />

      <DailyMobility />

      {!state.equipment && <EquipmentPrompt />}

      <section className="stat-row" aria-label="Your progress">
        <Stat label="Skills mastered" value={stats.mastered} sub={`of ${exercises.length}`} />
        <Stat label="Ready to train" value={stats.ready} sub="unlocked" />
        <Stat label="Sessions logged" value={stats.sessions} />
        <Stat label="Days trained" value={stats.days} />
      </section>

      <RecentActivity />

      <section className="skill-section" aria-labelledby="skills-title">
        <div className="home-section__head">
          <h2 id="skills-title">Your skills</h2>
          <a href="#/trees/all" className="link-btn">
            All trees <ArrowRight size={14} aria-hidden />
          </a>
        </div>
        <div className="skill-grid">
          {ordered
            .filter((t) => t.kind === 'skill')
            .map((t) => (
              <TreeCard key={t.id} tree={t} inPlan={planned.has(t.id)} />
            ))}
        </div>
      </section>

      <section className="skill-section" aria-labelledby="therapy-title">
        <div className="home-section__head">
          <h2 id="therapy-title">Physical therapy & mobility</h2>
          <a href={toHash({ name: 'workout', focus: ['shoulder', 'lower-back', 'hips', 'mobility'] })} className="link-btn">
            Recovery workout <ArrowRight size={14} aria-hidden />
          </a>
        </div>
        <div className="skill-grid">
          {ordered
            .filter((t) => t.kind === 'therapy')
            .map((t) => (
              <TreeCard key={t.id} tree={t} inPlan={planned.has(t.id)} />
            ))}
        </div>
      </section>
    </div>
  );
}

/** Shown until you've said what equipment you have. */
function EquipmentPrompt() {
  return (
    <a href="#/equipment" className="card equipment-prompt">
      <span className="equipment-prompt__icon" aria-hidden>
        <Wrench size={20} />
      </span>
      <span>
        <strong>What equipment do you have?</strong>
        <span className="muted small">
          Pull-up bar, dip bars, bands, dumbbells, an exercise ball… Tell Ascent and your workouts will only include what
          you can do, with stand-ins like chairs for dips.
        </span>
      </span>
      <ArrowRight size={18} aria-hidden />
    </a>
  );
}

function Welcome() {
  const { setOnboarded } = useProgress();
  const cloud = useCloud();
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
      {cloud.available && !cloud.user && cloud.ready && (
        <p className="welcome__signin small">
          Already have an account? <GoogleSignInButton compact />
        </p>
      )}
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

/**
 * One area (tree) as a square photo card: how far along the path to its
 * ultimate skill you are, and the step you're on now. Opens the tree.
 */
function TreeCard({ tree, inPlan }: { tree: TreeDef; inPlan: boolean }) {
  const { state } = useProgress();
  const peak = exerciseById[tree.ultimate];
  const path = goalProgress(peak.id, state.mastered);
  const all = treeStats(tree.id, state.mastered);
  const next = nextStepsToward(peak.id, state.mastered)[0];
  const done = !!state.mastered[peak.id];

  return (
    <a
      href={`#/trees/${tree.id}`}
      className={`tree-card${done ? ' is-done' : ''}`}
      style={{ '--tree': tree.color } as CSSProperties}
      aria-label={`${tree.name}: ${path.done} of ${path.total} steps to ${peak.name}${next && !done ? `, now on ${next.name}` : ''}`}
    >
      <img className="tree-card__photo" src={treeImages[tree.id]} alt="" loading="lazy" decoding="async" />
      <span className="tree-card__badges">
        {inPlan && <span className="tree-card__badge tree-card__badge--plan">In your plan</span>}
        <span className="tree-card__badge">
          {all.done}/{all.total}
          <span className="tree-card__badge-word"> skills</span>
        </span>
      </span>
      <span className="tree-card__body">
        <span className="tree-card__name">{tree.name}</span>
        <span className="tree-card__goal">
          {done ? <Trophy size={12} aria-hidden /> : null}
          {peak.name}
        </span>
        <span className="tree-card__meter" aria-hidden>
          <span style={{ width: pct(path.done / path.total) }} />
        </span>
        <span className="tree-card__steps">
          {done ? 'Mastered' : `${path.done} of ${path.total} steps`}
        </span>
        {next && !done && (
          <span className="tree-card__next">
            Next: <strong>{next.name}</strong> {formatTarget(next.target, { short: true, units: state.units })}
          </span>
        )}
      </span>
    </a>
  );
}

function RecentActivity() {
  const { state } = useProgress();
  const items = useMemo(() => {
    const logs = Object.entries(state.logs).flatMap(([id, list]) =>
      list.map((l) => ({ kind: 'log' as const, id, date: l.date, text: formatWork(exerciseById[id], l, state.units) })),
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
    return [...logs, ...mastered].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  }, [state.logs, state.mastered, state.units]);

  return (
    <section className="card home-activity">
      <div className="card__head">
        <h2>Recent activity</h2>
        {items.length > 0 && (
          <a href="#/history" className="link-btn">
            History <ArrowRight size={14} aria-hidden />
          </a>
        )}
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
