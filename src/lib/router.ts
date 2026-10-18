import { useMemo, useSyncExternalStore } from 'react';
import { exerciseById, treeById, type TreeId } from '../data';

export type TreeView = TreeId | 'all';

export type Route =
  | { name: 'train' }
  | { name: 'workout'; focus?: TreeId[] }
  | { name: 'trees'; tree: TreeView; skill?: string }
  | { name: 'start' }
  | { name: 'settings' };

export function parseHash(hash: string): Route {
  const parts = hash
    .replace(/^#\/?/, '')
    .split('/')
    .filter(Boolean)
    .map((p) => decodeURIComponent(p));

  switch (parts[0]) {
    case 'trees': {
      const skill = parts[2] && exerciseById[parts[2]] ? parts[2] : undefined;
      const tree: TreeView =
        parts[1] === 'all' || (parts[1] && parts[1] in treeById)
          ? (parts[1] as TreeView)
          : skill
            ? exerciseById[skill].tree
            : 'push';
      return { name: 'trees', tree, skill };
    }
    case 'workout': {
      const focus = (parts[1] ?? '').split(',').filter((t): t is TreeId => t in treeById);
      return focus.length ? { name: 'workout', focus } : { name: 'workout' };
    }
    case 'start':
      return { name: 'start' };
    case 'settings':
      return { name: 'settings' };
    default:
      return { name: 'train' };
  }
}

export function toHash(route: Route): string {
  switch (route.name) {
    case 'trees':
      return `#/trees/${route.tree}${route.skill ? `/${route.skill}` : ''}`;
    case 'workout':
      return route.focus?.length ? `#/workout/${route.focus.join(',')}` : '#/workout';
    case 'start':
      return '#/start';
    case 'settings':
      return '#/settings';
    case 'train':
      return '#/train';
  }
}

/** Link to a skill. Opens in `view` if given, otherwise in its own tree. */
export function skillHref(id: string, view?: TreeView): string {
  return toHash({ name: 'trees', tree: view ?? exerciseById[id].tree, skill: id });
}

const LAST_TREE_KEY = 'ascent:last-tree';

/** Remembers the last tree viewed so the main nav can return to it. */
export function rememberTreeView(view: TreeView) {
  try {
    localStorage.setItem(LAST_TREE_KEY, view);
  } catch {
    // storage unavailable; fall back to the default tree
  }
}

export function lastTreeHref(): string {
  let view: string | null = null;
  try {
    view = localStorage.getItem(LAST_TREE_KEY);
  } catch {
    // ignore
  }
  return view === 'all' || (view && view in treeById) ? `#/trees/${view}` : '#/trees/push';
}

export function navigate(to: Route | string, opts: { replace?: boolean } = {}) {
  const hash = typeof to === 'string' ? to : toHash(to);
  if (opts.replace) {
    history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = hash;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return useMemo(() => parseHash(hash), [hash]);
}
