import dagre from '@dagrejs/dagre';
import { exerciseById, exercises, trees, type TreeId } from '../data';
import type { TreeView } from './router';

export const NODE_W = 200;
export const NODE_H = 84;
export const GHOST_W = 180;
export const GHOST_H = 60;

export interface LayoutNode {
  id: string;
  /** A prerequisite that lives in another tree, shown for context. */
  ghost: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutEdge {
  id: string;
  source: string;
  target: string;
}

/** A box around one tree's exercises, used in the "All" view. */
export interface LayoutCluster {
  tree: TreeId;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TreeLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  clusters: LayoutCluster[];
}

const CLUSTER_PAD = 20;
const CLUSTER_LABEL = 30;

const cache = new Map<TreeView, TreeLayout>();

/**
 * Positions a tree's exercises top-to-bottom (easiest at the top) with dagre.
 * Prerequisites from other trees are added as "ghost" nodes.
 */
export function layoutTree(view: TreeView): TreeLayout {
  const cached = cache.get(view);
  if (cached) return cached;

  const members = view === 'all' ? exercises : exercises.filter((e) => e.tree === view);
  const memberIds = new Set(members.map((e) => e.id));
  const ghosts = new Set<string>();
  const edges: LayoutEdge[] = [];

  for (const ex of members) {
    for (const req of ex.requires) {
      if (!memberIds.has(req)) ghosts.add(req);
      edges.push({ id: `${req}->${ex.id}`, source: req, target: ex.id });
    }
  }

  const clustered = view === 'all';
  const g = new dagre.graphlib.Graph({ compound: clustered });
  g.setGraph({ rankdir: 'TB', nodesep: 28, ranksep: clustered ? 80 : 64, marginx: 32, marginy: 32 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const ex of members) g.setNode(ex.id, { width: NODE_W, height: NODE_H });
  for (const id of ghosts) g.setNode(id, { width: GHOST_W, height: GHOST_H });
  if (clustered) {
    for (const t of trees) g.setNode(`cluster:${t.id}`, {});
    for (const ex of members) g.setParent(ex.id, `cluster:${ex.tree}`);
  }
  // Track edges get more weight so progressions stay in straight columns.
  const trackOf = new Map(exercises.map((e) => [e.id, e.track]));
  for (const e of edges) {
    const sameTrack = trackOf.get(e.source) === trackOf.get(e.target);
    g.setEdge(e.source, e.target, { weight: sameTrack ? 4 : 1 });
  }
  dagre.layout(g);

  const nodes: LayoutNode[] = [...memberIds, ...ghosts].map((id) => {
    const n = g.node(id);
    const ghost = ghosts.has(id);
    const width = ghost ? GHOST_W : NODE_W;
    const height = ghost ? GHOST_H : NODE_H;
    // dagre gives centres; React Flow wants the top-left corner.
    return { id, ghost, width, height, x: n.x - width / 2, y: n.y - height / 2 };
  });

  // Cluster boxes from the member bounds, with room for a label on top.
  const clusters: LayoutCluster[] = clustered
    ? trees.map((t) => {
        const own = nodes.filter((n) => exerciseById[n.id].tree === t.id);
        const minX = Math.min(...own.map((n) => n.x)) - CLUSTER_PAD;
        const minY = Math.min(...own.map((n) => n.y)) - CLUSTER_PAD - CLUSTER_LABEL;
        const maxX = Math.max(...own.map((n) => n.x + n.width)) + CLUSTER_PAD;
        const maxY = Math.max(...own.map((n) => n.y + n.height)) + CLUSTER_PAD;
        return { tree: t.id, x: minX, y: minY, width: maxX - minX, height: maxY - minY };
      })
    : [];

  const layout = { nodes, edges, clusters };
  cache.set(view, layout);
  return layout;
}
