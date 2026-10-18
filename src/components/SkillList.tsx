import type { CSSProperties } from 'react';
import { Star } from 'lucide-react';
import { exerciseById, tracks, treeById, trees, type Track } from '../data';
import { formatTarget } from '../lib/format';
import { statusOf } from '../lib/graph';
import { skillHref, type TreeView } from '../lib/router';
import { useProgress } from '../state/ProgressContext';
import { StatusIcon, statusLabel } from './StatusIcon';

interface Props {
  view: TreeView;
  selected?: string;
}

/** The same trees as the map, laid out as vertical progressions. Easier to scan on a phone. */
export function SkillList({ view, selected }: Props) {
  const treeIds = view === 'all' ? trees.map((t) => t.id) : [view];
  return (
    <div className="skill-list">
      {treeIds.map((tid) => (
        <section key={tid} className="skill-list__tree">
          {view === 'all' && <h2 className="skill-list__heading">{treeById[tid].name}</h2>}
          <div className="skill-list__grid">
            {tracks
              .filter((t) => t.tree === tid)
              .map((track) => (
                <TrackCard key={track.key} track={track} view={view} selected={selected} />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function TrackCard({ track, view, selected }: { track: Track; view: TreeView; selected?: string }) {
  const { state } = useProgress();
  const color = treeById[track.tree].color;
  const done = track.steps.filter((s) => state.mastered[s.id]).length;
  const startsAfter = track.steps[0].requires;

  return (
    <article className="track-card" style={{ '--tree': color } as CSSProperties}>
      <header className="track-card__header">
        <h3>{track.name}</h3>
        <span className="track-card__count">
          {done}/{track.steps.length}
        </span>
      </header>
      {startsAfter.length > 0 && (
        <p className="track-card__needs">
          Starts after{' '}
          {startsAfter.map((id, i) => (
            <span key={id}>
              {i > 0 && ' + '}
              <a href={skillHref(id, view === 'all' ? 'all' : undefined)}>{exerciseById[id].name}</a>
            </span>
          ))}
        </p>
      )}
      <ol className="track-steps">
        {track.steps.map((step) => {
          const status = statusOf(step.id, state.mastered);
          const extra = step.requires.filter((r) => exerciseById[r].track !== step.track && step.step > 0);
          return (
            <li key={step.id}>
              <a
                href={skillHref(step.id, view)}
                className={`track-step is-${status}${selected === step.id ? ' is-selected' : ''}`}
                aria-current={selected === step.id ? 'true' : undefined}
              >
                <span className="track-step__icon" title={statusLabel[status]}>
                  <StatusIcon status={status} />
                </span>
                <span className="track-step__main">
                  <span className="track-step__name">
                    {step.name}
                    {state.goals.includes(step.id) && (
                      <Star size={13} className="track-step__goal" aria-label="Goal" />
                    )}
                  </span>
                  {extra.length > 0 && (
                    <span className="track-step__extra">
                      also needs {extra.map((r) => exerciseById[r].name).join(', ')}
                    </span>
                  )}
                </span>
                <span className="track-step__target">{formatTarget(step.target, { short: true })}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </article>
  );
}
