import { ArrowUp, Clock, Flag, Lightbulb, RotateCcw } from 'lucide-react';
import type { Exercise } from '../data';
import { isLevelUp, type PlanKind, type SessionPlan } from '../lib/progression';
import { formatAdded, type Units } from '../lib/units';

export const planKindLabel: Record<PlanKind, string> = {
  start: 'Starting point',
  progress: 'Level up',
  'add-set': 'Add a set',
  repeat: 'Go again',
  reset: 'Reset',
  consolidate: 'Volume day',
  return: 'Ease back in',
  mastery: 'Mastery',
  maintain: 'Maintain',
};

interface Props {
  ex: Exercise;
  plan: SessionPlan;
  /** "Today's plan", or "Next session" once today's is logged. */
  title: string;
  units: Units;
}

export function SessionPlanCard({ ex, plan, title, units }: Props) {
  const unit = ex.target.unit === 'seconds' ? 's' : ex.target.value === 1 ? ' rep' : ' reps';
  const load = plan.addedKg !== undefined ? formatAdded(plan.addedKg, units) : null;
  const each = ex.target.perSide ? ' each side' : '';
  const KindIcon = isLevelUp(plan) ? ArrowUp : plan.kind === 'repeat' || plan.kind === 'reset' ? RotateCcw : Flag;

  return (
    <div className={`plan-card plan-card--${plan.kind}`}>
      <div className="plan-card__head">
        <span className="eyebrow">{title}</span>
        <span className={`tag plan-tag plan-tag--${plan.kind}`}>
          <KindIcon size={12} aria-hidden /> {planKindLabel[plan.kind]}
        </span>
      </div>
      <ol className="plan-sets" aria-label="Sets">
        {Array.from({ length: plan.sets }, (_, i) => (
          <li key={i}>
            <span className="plan-sets__n">Set {i + 1}</span>
            <span className="plan-sets__v">
              {plan.value}
              {unit}
            </span>
            {load && <span className="plan-sets__load">{load}</span>}
          </li>
        ))}
      </ol>
      {each && <p className="plan-card__note">Do every set on both sides.</p>}
      <p className="plan-card__reason">{plan.reason}</p>
      {plan.tip && (
        <p className="plan-card__tip">
          <Lightbulb size={14} aria-hidden /> {plan.tip}
        </p>
      )}
      <div className="plan-card__meta">
        <span>
          <Clock size={13} aria-hidden /> Rest {plan.rest} between sets
        </span>
        {plan.kind !== 'maintain' && plan.kind !== 'mastery' && (
          <span>
            <Flag size={13} aria-hidden /> About {plan.sessionsToMastery} session{plan.sessionsToMastery === 1 ? '' : 's'}{' '}
            to mastery at this pace
          </span>
        )}
      </div>
    </div>
  );
}
