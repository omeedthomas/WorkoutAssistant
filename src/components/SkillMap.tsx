import { useCallback, useEffect, useMemo, useRef, type CSSProperties, type KeyboardEvent } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type NodeProps,
} from '@xyflow/react';
import { exerciseById, treeById, type TreeId } from '../data';
import { bestLog, goalPathSet, logScore, statusOf, treeStats } from '../lib/graph';
import { layoutTree } from '../lib/layout';
import { navigate, skillHref, type TreeView } from '../lib/router';
import { useProgress } from '../state/ProgressContext';
import { SkillNode, type SkillFlowNode } from './SkillNode';
import { statusLabel } from './StatusIcon';

type ClusterFlowNode = Node<{ tree: TreeId; done: number; total: number }, 'cluster'>;
type MapNode = SkillFlowNode | ClusterFlowNode;

/** Labelled background box around one tree in the "All" view. */
function ClusterNode({ data }: NodeProps<ClusterFlowNode>) {
  const tree = treeById[data.tree];
  return (
    <div className="cluster-node" style={{ '--tree': tree.color } as CSSProperties}>
      <span className="cluster-node__label">
        <span className="dot" aria-hidden />
        {tree.name}
        <span className="cluster-node__count">
          {data.done}/{data.total}
        </span>
      </span>
    </div>
  );
}

const nodeTypes = { skill: SkillNode, cluster: ClusterNode };

/** Must match the detail panel sizes in styles/detail.css. */
const SHEET_FRACTION = 0.6;
const PANEL_WIDTH = 420;
const NARROW_QUERY = '(max-width: 767px)';
const MIN_ZOOM = 0.12;

interface Props {
  view: TreeView;
  selected?: string;
}

export function SkillMap(props: Props) {
  return (
    <ReactFlowProvider>
      <SkillMapInner {...props} />
    </ReactFlowProvider>
  );
}

function SkillMapInner({ view, selected }: Props) {
  const { state } = useProgress();
  const { setCenter, setViewport, getViewport } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  const clickedRef = useRef<string | null>(null);
  const initialSelected = useRef(selected).current;

  const layout = useMemo(() => layoutTree(view), [view]);
  const pathSet = useMemo(() => goalPathSet(state.goals), [state.goals]);

  // Every progress change rebuilds the nodes. Each one carries `measured` (its size is fixed by the layout):
  // without it React Flow forgets where the node's handles are and hides every edge until it re-measures,
  // which made the whole map flicker after marking a skill mastered.
  const nodes = useMemo<MapNode[]>(
    () => [
      ...layout.clusters.map(
        (c): ClusterFlowNode => ({
          id: `cluster:${c.tree}`,
          type: 'cluster',
          position: { x: c.x, y: c.y },
          width: c.width,
          height: c.height,
          measured: { width: c.width, height: c.height },
          zIndex: -1,
          draggable: false,
          selectable: false,
          focusable: false,
          data: { tree: c.tree, ...treeStats(c.tree, state.mastered) },
        }),
      ),
      ...layout.nodes.map((n): SkillFlowNode => {
        const ex = exerciseById[n.id];
        const status = statusOf(n.id, state.mastered);
        const best = bestLog(ex, state.logs[n.id]);
        return {
          id: n.id,
          type: 'skill',
          position: { x: n.x, y: n.y },
          width: n.width,
          height: n.height,
          measured: { width: n.width, height: n.height },
          draggable: false,
          connectable: false,
          ariaLabel: `${ex.name}, level ${ex.level}, ${statusLabel[status]}`,
          data: {
            exerciseId: n.id,
            status,
            ghost: n.ghost,
            isGoal: state.goals.includes(n.id),
            onGoalPath: pathSet.has(n.id),
            isSelected: n.id === selected,
            progress: best ? logScore(ex, best) : 0,
            hasLogs: !!best,
            units: state.units,
          },
        };
      }),
    ],
    [layout, state.mastered, state.logs, state.goals, state.units, pathSet, selected],
  );

  const edges = useMemo<Edge[]>(
    () =>
      layout.edges.map((e) => {
        const sourceDone = !!state.mastered[e.source];
        const targetStatus = statusOf(e.target, state.mastered);
        const onPath = pathSet.has(e.source) && pathSet.has(e.target);
        let className = 'edge-locked';
        if (sourceDone && targetStatus === 'mastered') className = 'edge-mastered';
        else if (sourceDone) className = 'edge-ready';
        if (onPath && targetStatus !== 'mastered') className += ' edge-goal';
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          className,
          animated: targetStatus === 'available',
          focusable: false,
          style: { '--edge': treeById[exerciseById[e.target].tree].color } as CSSProperties,
        };
      }),
    [layout, state.mastered, pathSet],
  );

  /** Screen-space area of the map not hidden behind the detail panel/sheet. */
  const visibleArea = useCallback(() => {
    const el = containerRef.current;
    const w = el?.clientWidth ?? window.innerWidth;
    const h = el?.clientHeight ?? window.innerHeight;
    if (window.matchMedia(NARROW_QUERY).matches) {
      const top = el?.getBoundingClientRect().top ?? 0;
      const sheetTop = window.innerHeight * (1 - SHEET_FRACTION) - top;
      return { left: 0, top: 0, right: w, bottom: Math.max(120, Math.min(h, sheetTop)) };
    }
    return { left: 0, top: 0, right: Math.max(240, w - PANEL_WIDTH), bottom: h };
  }, []);

  /** Pans so the node sits in the visible area. With `onlyIfHidden`, does nothing if it's already visible. */
  const reveal = useCallback(
    (id: string, { animate = true, onlyIfHidden = false } = {}) => {
      const n = layout.nodes.find((node) => node.id === id);
      const el = containerRef.current;
      if (!n || !el) return;
      const vp = getViewport();
      const area = visibleArea();
      const sx = n.x * vp.zoom + vp.x;
      const sy = n.y * vp.zoom + vp.y;
      const fits =
        sx >= area.left &&
        sy >= area.top &&
        sx + n.width * vp.zoom <= area.right &&
        sy + n.height * vp.zoom <= area.bottom;
      if (onlyIfHidden && fits) return;

      const zoom = onlyIfHidden ? vp.zoom : Math.max(vp.zoom, 0.85);
      const targetX = (area.left + area.right) / 2;
      const targetY = (area.top + area.bottom) / 2;
      // setCenter puts a flow point at the container's centre; offset so the node lands at the target instead.
      const cx = n.x + n.width / 2 + (el.clientWidth / 2 - targetX) / zoom;
      const cy = n.y + n.height / 2 + (el.clientHeight / 2 - targetY) / zoom;
      void setCenter(cx, cy, { zoom, duration: animate ? 450 : 0 });
    },
    [layout, getViewport, setCenter, visibleArea],
  );

  /** Initial camera: fit if readable, otherwise start at the top (beginner end) of the tree. */
  const initialView = useCallback(() => {
    const el = containerRef.current;
    if (!el || layout.nodes.length === 0) return;
    const boxes = [...layout.nodes, ...layout.clusters];
    const minX = Math.min(...boxes.map((n) => n.x));
    const minY = Math.min(...boxes.map((n) => n.y));
    const maxX = Math.max(...boxes.map((n) => n.x + n.width));
    const maxY = Math.max(...boxes.map((n) => n.y + n.height));
    const pad = 24;
    const w = el.clientWidth;
    const h = el.clientHeight;
    const fit = Math.min((w - pad * 2) / (maxX - minX), (h - pad * 2) / (maxY - minY), 1);
    const narrow = window.matchMedia(NARROW_QUERY).matches;
    // "All" is an overview, so fit everything; single trees start zoomed in enough to read.
    const readable = view === 'all' ? MIN_ZOOM : narrow ? 0.6 : 0.85;
    const zoom = Math.max(fit, readable);
    const gw = (maxX - minX) * zoom;
    const gh = (maxY - minY) * zoom;
    const x = (w - gw) / 2 - minX * zoom;
    const y = gh <= h - pad * 2 ? (h - gh) / 2 - minY * zoom : pad - minY * zoom;
    void setViewport({ x, y, zoom });
  }, [layout, setViewport, view]);

  const onInit = useCallback(() => {
    initialView();
    if (initialSelected) reveal(initialSelected, { animate: false });
  }, [initialView, initialSelected, reveal]);

  // Bring the selection into view when it changes from outside the map
  // (detail-panel links, dashboard), or when a click lands under the panel.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (!selected) return;
    const fromClick = clickedRef.current === selected;
    clickedRef.current = null;
    reveal(selected, { onlyIfHidden: fromClick });
  }, [selected, reveal]);

  const open = useCallback(
    (id: string) => {
      if (!exerciseById[id]) return; // cluster boxes
      const ghost = layout.nodes.find((n) => n.id === id)?.ghost;
      if (ghost) {
        navigate(skillHref(id)); // jump to the tree it belongs to
      } else {
        clickedRef.current = id;
        navigate(skillHref(id, view));
      }
    },
    [layout, view],
  );

  const onNodeClick = useCallback<NodeMouseHandler<MapNode>>((_, node) => open(node.id), [open]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const id = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>('.react-flow__node')
      ?.dataset.id;
    if (id) {
      e.preventDefault();
      open(id);
    }
  };

  return (
    <div className="skill-map" ref={containerRef} onKeyDown={onKeyDown}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onInit={onInit}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnDoubleClick={false}
        minZoom={MIN_ZOOM}
        maxZoom={1.6}
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} />
        <Controls showInteractive={false} position="bottom-left" className="map-controls" />
      </ReactFlow>
    </div>
  );
}
