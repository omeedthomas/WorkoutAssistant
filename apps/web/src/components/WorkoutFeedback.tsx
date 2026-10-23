import { exerciseById } from '@ascent/core/data';
import { formatWork } from '@ascent/core/lib/format';
import type { Units } from '@ascent/core/lib/units';
import type { ActiveWorkout } from '@ascent/core/state/activeWorkout';
import type { WorkoutRating } from '@ascent/core/state/progress';

export interface Feedback {
  rating: WorkoutRating | null;
  /** Exercise ids to make harder (Easy) or easier (Too hard) next time. */
  adjust: string[];
}

export const NO_FEEDBACK: Feedback = { rating: null, adjust: [] };

/** A logged exercise of the workout, to pick for next time. */
export interface FeedbackItem {
  id: string;
  name: string;
  /** What was logged, e.g. "10, 9, 8 reps". */
  done: string;
}

/** The exercises logged in a workout, as choices. */
export function feedbackItems(w: ActiveWorkout, units: Units): FeedbackItem[] {
  return w.main.flatMap((m) => {
    const ex = exerciseById[m.exerciseId];
    return m.logged && ex ? [{ id: ex.id, name: ex.name, done: formatWork(ex, m.logged, units) }] : [];
  });
}

const RATINGS: { value: WorkoutRating; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'right', label: 'Just right' },
  { value: 'hard', label: 'Too hard' },
];

/**
 * Asked when a workout ends: how was it? After Easy or Too hard you pick the exercises to change, and their
 * next plans step up or ease off.
 */
export function WorkoutFeedback({ items, value, onChange }: { items: FeedbackItem[]; value: Feedback; onChange: (f: Feedback) => void }) {
  const toggle = (id: string) =>
    onChange({ ...value, adjust: value.adjust.includes(id) ? value.adjust.filter((x) => x !== id) : [...value.adjust, id] });
  const hard = value.rating === 'hard';
  return (
    <div className="feedback">
      <p className="feedback__question" id="feedback-question">
        <strong>How was this workout?</strong>
      </p>
      <div className="segmented feedback__ratings" role="group" aria-labelledby="feedback-question">
        {RATINGS.map((r) => (
          <button
            key={r.value}
            type="button"
            aria-pressed={value.rating === r.value}
            // Switching between Easy and Too hard starts the picks over: they mean the opposite.
            onClick={() => onChange({ rating: r.value, adjust: r.value === value.rating ? value.adjust : [] })}
          >
            {r.label}
          </button>
        ))}
      </div>
      {value.rating === 'right' && <p className="small muted">Nice. Your plans keep progressing as usual.</p>}
      {(value.rating === 'easy' || hard) &&
        (items.length ? (
          <fieldset className="feedback__pick">
            <legend className="small">
              {hard
                ? 'Which exercises should be easier next time? They get fewer reps (or less weight).'
                : 'Which exercises should be harder next time? They get more reps (or weight).'}
            </legend>
            {items.map((it) => (
              <label key={it.id} className="feedback__item">
                <input type="checkbox" checked={value.adjust.includes(it.id)} onChange={() => toggle(it.id)} />
                <span className="feedback__name">{it.name}</span>
                <span className="muted small">{it.done}</span>
              </label>
            ))}
          </fieldset>
        ) : (
          <p className="small muted">Log an exercise to have its next plan adjusted.</p>
        ))}
    </div>
  );
}
