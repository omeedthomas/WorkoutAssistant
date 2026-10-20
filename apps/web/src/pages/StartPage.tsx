import { useMemo, useState, type CSSProperties } from 'react';
import { Check } from 'lucide-react';
import { useToast } from '../components/Toast';
import { tracks, trees, type Track } from '@ascent/core/data';
import { formatTarget } from '@ascent/core/lib/format';
import { withAncestors } from '@ascent/core/lib/graph';
import { navigate } from '../lib/router';
import { progressReducer } from '@ascent/core/state/progress';
import { useProgress } from '../state/ProgressContext';

const OPEN_BY_DEFAULT = new Set(['push', 'pull', 'core', 'legs']);

function hardestMastered(track: Track, mastered: Record<string, string>): number {
  let idx = -1;
  track.steps.forEach((s, i) => {
    if (mastered[s.id]) idx = i;
  });
  return idx;
}

/** "Where are you starting from?": pick the hardest step you can do in each progression. */
export function StartPage() {
  const { state, applyStartingPoint } = useProgress();
  const toast = useToast();

  // Snapshot on mount so later edits are compared against where the user began.
  const snapshot = () => Object.fromEntries(tracks.map((t) => [t.key, hardestMastered(t, state.mastered)]));
  const [initial, setInitial] = useState(snapshot);
  const [selection, setSelection] = useState<Record<string, number>>(initial);

  // Progress replaced while this page is open (signing in, a sync from another device): start over
  // from it, otherwise saving would compare against the old snapshot and could unmaster synced skills.
  const masteredKey = useMemo(() => Object.keys(state.mastered).sort().join(), [state.mastered]);
  const [snapshotKey, setSnapshotKey] = useState(masteredKey);
  if (snapshotKey !== masteredKey) {
    const next = snapshot();
    setSnapshotKey(masteredKey);
    setInitial(next);
    setSelection(next);
  }

  const plan = useMemo(() => {
    const chosen: string[] = [];
    const unmaster: string[] = [];
    for (const t of tracks) {
      const idx = selection[t.key];
      if (idx === initial[t.key]) continue;
      if (idx >= 0) chosen.push(t.steps[idx].id);
      unmaster.push(...t.steps.slice(idx + 1).map((s) => s.id));
    }
    const preview = progressReducer(state, {
      type: 'applyStartingPoint',
      master: withAncestors(chosen),
      unmaster,
      at: 'preview',
    }).mastered;
    return { chosen, unmaster, preview };
  }, [selection, initial, state]);

  const masteredCount = Object.keys(plan.preview).length;

  const save = () => {
    applyStartingPoint(plan.chosen, plan.unmaster);
    toast('Starting point saved', `${masteredCount} skills marked mastered`);
    navigate('#/train');
  };

  return (
    <div className="page page--narrow start-page">
      <header className="page-header">
        <h1>Where are you starting from?</h1>
        <p className="muted">
          For each progression, tap the <strong>hardest version you can do</strong> for the target sets and reps
          with good form. Everything before it gets marked mastered, including prerequisites from other trees.
          Skip anything you haven't tried. You can change this any time.
        </p>
      </header>

      {trees.map((tree) => (
        <details
          key={tree.id}
          className="start-tree"
          open={OPEN_BY_DEFAULT.has(tree.id)}
          style={{ '--tree': tree.color } as CSSProperties}
        >
          <summary>
            <span className="dot" aria-hidden />
            <span className="start-tree__name">{tree.name}</span>
            <span className="muted small">{tree.tagline}</span>
          </summary>
          {tracks
            .filter((t) => t.tree === tree.id)
            .map((track) => (
              <fieldset key={track.key} className="start-track">
                <legend>{track.name}</legend>
                <div className="start-track__options">
                  <button
                    type="button"
                    className="option"
                    aria-pressed={selection[track.key] === -1}
                    onClick={() => setSelection((s) => ({ ...s, [track.key]: -1 }))}
                  >
                    Not yet
                  </button>
                  {track.steps.map((step, i) => {
                    const chosen = selection[track.key] === i;
                    const included = !chosen && !!plan.preview[step.id];
                    return (
                      <button
                        type="button"
                        key={step.id}
                        className={`option${included ? ' is-included' : ''}`}
                        aria-pressed={chosen}
                        onClick={() => setSelection((s) => ({ ...s, [track.key]: i }))}
                      >
                        {(chosen || included) && <Check size={13} aria-hidden />}
                        <span>{step.name}</span>
                        <span className="option__target">{formatTarget(step.target, { short: true, units: state.units })}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
        </details>
      ))}

      <div className="start-footer">
        <span>
          <strong>{masteredCount}</strong> skill{masteredCount === 1 ? '' : 's'} will be marked mastered
        </span>
        <div className="start-footer__actions">
          <a href="#/train" className="btn">
            Cancel
          </a>
          <button className="btn btn--primary" onClick={save}>
            Save starting point
          </button>
        </div>
      </div>
    </div>
  );
}
