import { describe, expect, it } from 'vitest';
import { parseHash, toHash, type Route } from './router';

describe('router', () => {
  it('round-trips every page', () => {
    const routes: Route[] = [
      { name: 'train' },
      { name: 'workout', focus: ['push', 'pull'] },
      { name: 'history', day: '2026-10-18' },
      { name: 'trees', tree: 'push', skill: 'pushup' },
      { name: 'start' },
      { name: 'settings' },
      { name: 'equipment' },
      { name: 'mobility' },
      { name: 'mobility', routine: 'upper-back' },
      { name: 'privacy' },
      { name: 'terms' },
    ];
    for (const r of routes) expect(parseHash(toHash(r))).toEqual(r);
  });

  it('opens the legal pages from their links', () => {
    expect(parseHash('#/privacy')).toEqual({ name: 'privacy' });
    expect(parseHash('#/terms')).toEqual({ name: 'terms' });
  });

  it('ignores unknown mobility routines', () => {
    expect(parseHash('#/mobility/nope')).toEqual({ name: 'mobility' });
  });

  it('falls back to Home for unknown pages', () => {
    expect(parseHash('#/nope')).toEqual({ name: 'train' });
  });
});
