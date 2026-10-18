import { useCallback, useEffect, useState } from 'react';
import { List, Network } from 'lucide-react';
import { SkillDetail } from '../components/SkillDetail';
import { SkillList } from '../components/SkillList';
import { SkillMap } from '../components/SkillMap';
import { TreeTabs } from '../components/TreeTabs';
import { treeById } from '../data';
import { navigate, rememberTreeView, type TreeView } from '../lib/router';

type Mode = 'map' | 'list';
const MODE_KEY = 'ascent:tree-mode';

function loadMode(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === 'list' ? 'list' : 'map';
  } catch {
    return 'map';
  }
}

export function TreesPage({ view, skill }: { view: TreeView; skill?: string }) {
  const [mode, setMode] = useState<Mode>(loadMode);
  const tree = view === 'all' ? null : treeById[view];

  useEffect(() => rememberTreeView(view), [view]);

  const changeMode = (next: Mode) => {
    setMode(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      // not persisted; fine
    }
  };

  const close = useCallback(() => navigate({ name: 'trees', tree: view }), [view]);

  return (
    <div className="trees-page">
      <TreeTabs active={view} />
      <div className="trees-toolbar">
        <div className="trees-toolbar__info">
          <h1>{tree?.name ?? 'All skills'}</h1>
          <p>{tree?.tagline ?? 'Every progression, and how they feed into each other.'}</p>
        </div>
        <ul className="legend" aria-label="Legend">
          <li>
            <span className="legend__swatch is-mastered" /> Mastered
          </li>
          <li>
            <span className="legend__swatch is-available" /> Ready
          </li>
          <li>
            <span className="legend__swatch is-locked" /> Locked
          </li>
          <li>
            <span className="legend__swatch is-goal" /> Goal path
          </li>
        </ul>
        <div className="segmented" role="group" aria-label="View as">
          <button aria-pressed={mode === 'map'} onClick={() => changeMode('map')}>
            <Network size={16} aria-hidden /> Map
          </button>
          <button aria-pressed={mode === 'list'} onClick={() => changeMode('list')}>
            <List size={16} aria-hidden /> List
          </button>
        </div>
      </div>
      <div className={`trees-body${skill ? ' has-detail' : ''}`}>
        {mode === 'map' ? (
          <SkillMap key={view} view={view} selected={skill} />
        ) : (
          <SkillList view={view} selected={skill} />
        )}
        {skill && <SkillDetail key={skill} id={skill} view={view} onClose={close} />}
      </div>
    </div>
  );
}
