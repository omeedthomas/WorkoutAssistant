import { memo, type CSSProperties } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { Star } from 'lucide-react';
import { exerciseById, treeById } from '../data';
import { formatTarget } from '../lib/format';
import type { Status } from '../lib/graph';
import type { Units } from '../lib/units';
import { StatusIcon } from './StatusIcon';

export type SkillNodeData = {
  exerciseId: string;
  status: Status;
  /** Prerequisite from another tree, shown for context. */
  ghost: boolean;
  isGoal: boolean;
  onGoalPath: boolean;
  isSelected: boolean;
  /** 0–1 progress toward the target from the best logged session. */
  progress: number;
  hasLogs: boolean;
  units: Units;
};

export type SkillFlowNode = Node<SkillNodeData, 'skill'>;

function SkillNodeView({ data }: NodeProps<SkillFlowNode>) {
  const ex = exerciseById[data.exerciseId];
  const tree = treeById[ex.tree];
  const className = [
    'skill-node',
    `is-${data.status}`,
    data.ghost && 'is-ghost',
    data.isGoal && 'is-goal',
    data.onGoalPath && data.status !== 'mastered' && 'on-path',
    data.isSelected && 'is-selected',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} style={{ '--tree': tree.color } as CSSProperties}>
      <Handle type="target" position={Position.Top} isConnectable={false} />
      {data.ghost ? (
        <>
          <span className="skill-node__from">
            <StatusIcon status={data.status} size={12} /> From {tree.name}
          </span>
          <span className="skill-node__name">{ex.name}</span>
        </>
      ) : (
        <>
          <span className="skill-node__top">
            <span className="skill-node__level">L{ex.level}</span>
            {data.isGoal && <Star size={14} className="skill-node__goal" aria-label="Goal" />}
            <span className="skill-node__status">
              <StatusIcon status={data.status} />
            </span>
          </span>
          <span className="skill-node__name">{ex.name}</span>
          <span className="skill-node__target">{formatTarget(ex.target, { short: true, units: data.units })}</span>
          {data.hasLogs && data.status !== 'mastered' && (
            <span className="skill-node__bar" aria-hidden>
              <span style={{ width: `${Math.round(data.progress * 100)}%` }} />
            </span>
          )}
        </>
      )}
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </div>
  );
}

export const SkillNode = memo(SkillNodeView);
