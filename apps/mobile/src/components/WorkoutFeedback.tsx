import { Text, View } from 'react-native';
import { exerciseById } from '@ascent/core/data';
import { formatWork } from '@ascent/core/lib/format';
import type { Units } from '@ascent/core/lib/units';
import type { ActiveWorkout } from '@ascent/core/state/activeWorkout';
import type { WorkoutRating } from '@ascent/core/state/progress';
import { colors, space, type } from '../theme';
import { Chip, Segmented } from './ui';

/** Same as the web app's: how the workout felt, and which exercises to change next time. */
export interface Feedback {
  rating: WorkoutRating | null;
  /** Exercise ids to make harder (Easy) or easier (Too hard) next time. */
  adjust: string[];
}

export const NO_FEEDBACK: Feedback = { rating: null, adjust: [] };

const RATINGS: { value: WorkoutRating; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'right', label: 'Just right' },
  { value: 'hard', label: 'Too hard' },
];

/**
 * Asked when a workout ends: how was it? After Easy or Too hard you pick the exercises to change, and their
 * next plans step up or ease off.
 */
export function WorkoutFeedback({
  active,
  units,
  value,
  onChange,
}: {
  active: ActiveWorkout;
  units: Units;
  value: Feedback;
  onChange: (f: Feedback) => void;
}) {
  const items = active.main.flatMap((m) => {
    const ex = exerciseById[m.exerciseId];
    return m.logged && ex ? [{ id: ex.id, label: `${ex.name} · ${formatWork(ex, m.logged, units)}` }] : [];
  });
  const toggle = (id: string) =>
    onChange({ ...value, adjust: value.adjust.includes(id) ? value.adjust.filter((x) => x !== id) : [...value.adjust, id] });
  const hard = value.rating === 'hard';

  return (
    <View style={{ alignSelf: 'stretch', gap: space(3), marginTop: space(4) }}>
      <Text style={[type.heading, { textAlign: 'center' }]}>How was this workout?</Text>
      <Segmented
        label="How was this workout?"
        options={RATINGS}
        value={value.rating}
        // Switching between Easy and Too hard starts the picks over: they mean the opposite.
        onChange={(rating) => onChange({ rating, adjust: rating === value.rating ? value.adjust : [] })}
      />
      {value.rating === 'right' && <Text style={[type.small, { textAlign: 'center' }]}>Nice. Your plans keep progressing as usual.</Text>}
      {(value.rating === 'easy' || hard) &&
        (items.length ? (
          <>
            <Text style={[type.small, { color: colors.text2 }]}>
              {hard
                ? 'Which exercises should be easier next time? They get fewer reps (or less weight).'
                : 'Which exercises should be harder next time? They get more reps (or weight).'}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
              {items.map((it) => (
                <Chip key={it.id} label={it.label} selected={value.adjust.includes(it.id)} onPress={() => toggle(it.id)} />
              ))}
            </View>
          </>
        ) : (
          <Text style={type.small}>Log an exercise to have its next plan adjusted.</Text>
        ))}
    </View>
  );
}
