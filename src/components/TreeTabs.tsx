import { useEffect, useRef, type CSSProperties } from 'react';
import { exercises, trees } from '../data';
import { treeStats } from '../lib/graph';
import type { TreeView } from '../lib/router';
import { useProgress } from '../state/ProgressContext';

export function TreeTabs({ active }: { active: TreeView }) {
  const { state } = useProgress();
  const ref = useRef<HTMLElement>(null);

  // Keep the active tab visible on narrow screens where the row scrolls.
  useEffect(() => {
    ref.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [active]);

  const masteredCount = Object.keys(state.mastered).length;

  return (
    <nav className="tree-tabs" aria-label="Skill trees" ref={ref}>
      <a
        href="#/trees/all"
        className="tree-tab tree-tab--all"
        aria-current={active === 'all' ? 'page' : undefined}
      >
        All
        <span className="tree-tab__count">
          {masteredCount}/{exercises.length}
        </span>
      </a>
      {trees.map((t) => {
        const s = treeStats(t.id, state.mastered);
        return (
          <a
            key={t.id}
            href={`#/trees/${t.id}`}
            className="tree-tab"
            style={{ '--tree': t.color } as CSSProperties}
            aria-current={active === t.id ? 'page' : undefined}
          >
            <span className="dot" aria-hidden />
            {t.name}
            <span className="tree-tab__count">
              {s.done}/{s.total}
            </span>
          </a>
        );
      })}
    </nav>
  );
}
