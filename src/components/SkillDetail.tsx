import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Check, Star, Trash, Trophy, X } from 'lucide-react';
import { dependentsOf, exerciseById, tierOf, treeById } from '../data';
import { videos } from '../data/videos';
import { formatDate, formatSet, formatTarget, pct } from '../lib/format';
import { bestLog, logScore, meetsTarget, missingAncestors, statusOf } from '../lib/graph';
import { planSession } from '../lib/progression';
import { skillHref, type TreeView } from '../lib/router';
import { MAX_GOALS } from '../state/progress';
import { useProgress } from '../state/ProgressContext';
import { HistoryChart } from './HistoryChart';
import { NumberStepper } from './NumberStepper';
import { planKindLabel, SessionPlanCard } from './SessionPlanCard';
import { StatusIcon, statusLabel } from './StatusIcon';
import { useToast } from './Toast';
import { VideoPlayer } from './VideoPlayer';

interface Props {
  id: string;
  view: TreeView;
  onClose: () => void;
}

export function SkillDetail({ id, view, onClose }: Props) {
  const { state, master, unmaster, log, deleteLog, toggleGoal } = useProgress();
  const toast = useToast();
  const ex = exerciseById[id];
  const tree = treeById[ex.tree];
  const status = statusOf(id, state.mastered);
  const logs = state.logs[id] ?? [];
  const best = bestLog(ex, logs);
  const missing = missingAncestors(id, state.mastered);
  const isGoal = state.goals.includes(id);
  const unit = ex.target.unit;
  const video = videos[id];

  const plan = useMemo(
    () => planSession(ex, logs, { mastered: status === 'mastered' }),
    [ex, logs, status],
  );
  const loggedToday = !!logs[0] && new Date(logs[0].date).toDateString() === new Date().toDateString();

  const [includeAncestors, setIncludeAncestors] = useState(true);
  // Pre-fill with the plan; adjust to what you actually did before logging.
  const [sets, setSets] = useState(plan.sets);
  const [value, setValue] = useState(plan.value);
  const [hitTarget, setHitTarget] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Links to related skills stay in the "All" view if that's where we are.
  const linkFor = (rid: string) => skillHref(rid, view === 'all' ? 'all' : undefined);

  const handleMaster = () => {
    const unlocked = master(id, { includeAncestors });
    setHitTarget(false);
    const names = unlocked.map((e) => e.name);
    toast(
      `${ex.name} mastered`,
      names.length
        ? `Unlocked ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` and ${names.length - 3} more` : ''}`
        : undefined,
    );
  };

  const handleLog = () => {
    const planned = { sets: plan.sets, value: plan.value };
    log(id, sets, value, planned);
    if (status !== 'mastered' && meetsTarget(ex, { sets, value })) {
      setHitTarget(true);
      return;
    }
    const entry = { id: 'new', date: new Date().toISOString(), sets, value, planned };
    const next = planSession(ex, [entry, ...logs], { mastered: status === 'mastered' });
    const completed = sets >= planned.sets && value >= planned.value;
    toast(
      completed && status !== 'mastered' ? 'Plan complete. Nice work!' : 'Session logged',
      `Next session: ${formatSet(next.sets, next.value, unit)}${ex.target.perSide ? ' each side' : ''} (${planKindLabel[next.kind].toLowerCase()})`,
    );
  };

  return (
    <aside className="detail" aria-labelledby="detail-title" style={{ '--tree': tree.color } as CSSProperties}>
      <div className="detail__grab" aria-hidden />
      <header className="detail__header">
        <div className="detail__eyebrow">
          <span className="dot" aria-hidden />
          {tree.name} · {ex.trackName}
        </div>
        <h2 id="detail-title">{ex.name}</h2>
        <div className="detail__badges">
          <span className={`badge badge--${status}`}>
            <StatusIcon status={status} size={13} />
            {statusLabel[status]}
          </span>
          <span className="badge">
            Level {ex.level} · {tierOf(ex.level)}
          </span>
          {isGoal && (
            <span className="badge badge--goal">
              <Star size={13} aria-hidden /> Goal
            </span>
          )}
        </div>
        <button className="icon-btn detail__close" onClick={onClose} aria-label="Close details">
          <X size={20} />
        </button>
      </header>

      <div className="detail__body">
        {video && <VideoPlayer video={video} exerciseName={ex.name} />}

        <div className="target-card">
          <div>
            <span className="eyebrow">Target to master</span>
            <strong className="target-card__value">{formatTarget(ex.target)}</strong>
          </div>
          {best && status !== 'mastered' && (
            <div className="target-card__best">
              <span>
                Best: {formatSet(best.sets, best.value, unit)} · {pct(logScore(ex, best))}
              </span>
              <span className="meter" aria-hidden>
                <span style={{ width: pct(logScore(ex, best)) }} />
              </span>
            </div>
          )}
          {status === 'mastered' && (
            <div className="target-card__done">
              <Trophy size={16} aria-hidden /> Mastered {formatDate(state.mastered[id]).toLowerCase()}
            </div>
          )}
        </div>

        {status === 'locked' && (
          <p className="callout callout--muted">
            Locked until you master {missing.length === 1 ? 'one earlier step' : `${missing.length} earlier steps`}.
            If you can already do them, you can still train this or mark it mastered.
          </p>
        )}

        <section className="detail__section log-box">
          <SessionPlanCard ex={ex} plan={plan} title={loggedToday ? 'Next session' : "Today's plan"} />
          <h3>Log what you did</h3>
          <div className="log-box__inputs">
            <NumberStepper label="Sets" value={sets} onChange={setSets} max={20} />
            <NumberStepper
              label={`${unit === 'seconds' ? 'Seconds' : 'Reps'} per set${ex.target.perSide ? ' (each side)' : ''}`}
              value={value}
              onChange={setValue}
              step={unit === 'seconds' ? 5 : 1}
              max={unit === 'seconds' ? 600 : 200}
            />
          </div>
          <button className="btn btn--block" onClick={handleLog}>
            Log {formatSet(sets, value, unit)}
          </button>
          {hitTarget && status !== 'mastered' && (
            <div className="callout callout--success">
              <span>
                <strong>Target hit!</strong> Ready to call it mastered?
              </span>
              <button className="btn btn--primary btn--sm" onClick={handleMaster}>
                Mark mastered
              </button>
            </div>
          )}
          {logs.length > 0 && (
            <>
              <h3>History</h3>
              <HistoryChart ex={ex} logs={logs} />
              <ul className="history" aria-label="Recent sessions">
                {logs.slice(0, 6).map((l) => (
                  <li key={l.id}>
                    <span className="history__date">{formatDate(l.date)}</span>
                    <span className="history__value">{formatSet(l.sets, l.value, unit)}</span>
                    {meetsTarget(ex, l) ? (
                      <Trophy size={14} className="history__hit" aria-label="Mastery target met" />
                    ) : l.planned && l.sets >= l.planned.sets && l.value >= l.planned.value ? (
                      <Check size={14} className="history__hit" aria-label="Plan completed" />
                    ) : null}
                    <button
                      className="icon-btn icon-btn--sm"
                      aria-label={`Delete session from ${formatDate(l.date)}`}
                      onClick={() => deleteLog(id, l.id)}
                    >
                      <Trash size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <p className="detail__desc">{ex.description}</p>

        <section className="detail__section">
          <h3>Form cues</h3>
          <ul className="cues">
            {ex.cues.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>

        <section className="detail__section">
          <h3>Requires</h3>
          {ex.requires.length === 0 ? (
            <p className="muted">Nothing. Anyone can start here.</p>
          ) : (
            <RelatedChips ids={ex.requires} linkFor={linkFor} />
          )}
        </section>

        <section className="detail__section">
          <h3>Unlocks</h3>
          {dependentsOf[id].length === 0 ? (
            <p className="muted">Nothing further. This is a peak skill.</p>
          ) : (
            <RelatedChips ids={dependentsOf[id]} linkFor={linkFor} />
          )}
        </section>
      </div>

      <footer className="detail__footer">
        {status === 'mastered' ? (
          <button className="btn" onClick={() => unmaster(id)}>
            Unmark mastered
          </button>
        ) : (
          <div className="detail__master">
            {missing.length > 0 && (
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={includeAncestors}
                  onChange={(e) => setIncludeAncestors(e.target.checked)}
                />
                Also mark the {missing.length} earlier step{missing.length === 1 ? '' : 's'} as mastered
              </label>
            )}
            <button className="btn btn--primary" onClick={handleMaster}>
              <Check size={16} aria-hidden /> Mark mastered
            </button>
          </div>
        )}
        <button
          className={`btn${isGoal ? ' btn--goal' : ''}`}
          onClick={() => toggleGoal(id)}
          disabled={!isGoal && state.goals.length >= MAX_GOALS}
          title={!isGoal && state.goals.length >= MAX_GOALS ? `You can have up to ${MAX_GOALS} goals` : undefined}
          aria-pressed={isGoal}
        >
          <Star size={16} aria-hidden fill={isGoal ? 'currentColor' : 'none'} />
          {isGoal ? 'Goal' : 'Set as goal'}
        </button>
      </footer>
    </aside>
  );
}

function RelatedChips({ ids, linkFor }: { ids: string[]; linkFor: (id: string) => string }) {
  const { state } = useProgress();
  return (
    <div className="chips">
      {ids.map((rid) => {
        const r = exerciseById[rid];
        const s = statusOf(rid, state.mastered);
        return (
          <a
            key={rid}
            href={linkFor(rid)}
            className={`chip is-${s}`}
            style={{ '--tree': treeById[r.tree].color } as CSSProperties}
          >
            <StatusIcon status={s} size={12} />
            {r.name}
          </a>
        );
      })}
    </div>
  );
}
