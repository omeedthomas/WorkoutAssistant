import { Minus, Plus } from 'lucide-react';
import type { Unit } from '@ascent/core/data';
import { NumberStepper } from './NumberStepper';

const MAX_SETS = 20;

/**
 * Each set's reps (or seconds), so a session is logged as it went: 10, then 9, then 8. Sets are numbered by
 * position; a gap (a set you didn't do) is left out. With `resizable`, sets can be added (a copy of the last
 * one) or taken off the end.
 */
export function SetsEditor({
  values,
  onChange,
  unit,
  resizable = false,
}: {
  values: (number | undefined)[];
  onChange: (values: (number | undefined)[]) => void;
  unit: Unit;
  resizable?: boolean;
}) {
  const seconds = unit === 'seconds';
  const done = values.filter((v) => v !== undefined);
  return (
    <div className="sets-editor" role="group" aria-label={seconds ? 'Seconds in each set' : 'Reps in each set'}>
      <div className="sets-editor__list">
        {values.flatMap((v, i) =>
          v === undefined
            ? []
            : [
                <NumberStepper
                  key={i}
                  label={`Set ${i + 1}${seconds ? ' (s)' : ''}`}
                  value={v}
                  onChange={(n) => onChange(values.map((x, j) => (j === i ? n : x)))}
                  step={seconds ? 5 : 1}
                  max={seconds ? 600 : 200}
                />,
              ],
        )}
      </div>
      {resizable && (
        <div className="sets-editor__resize">
          <button type="button" className="btn btn--sm" onClick={() => onChange(values.slice(0, -1))} disabled={done.length <= 1}>
            <Minus size={14} aria-hidden /> Remove a set
          </button>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => onChange([...values, done[done.length - 1] ?? 1])}
            disabled={values.length >= MAX_SETS}
          >
            <Plus size={14} aria-hidden /> Add a set
          </button>
        </div>
      )}
    </div>
  );
}
