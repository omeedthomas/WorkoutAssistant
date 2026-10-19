import { useEffect, useId, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

interface Props {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
}

export function NumberStepper({ label, value, onChange, step = 1, min = 1, max = 999 }: Props) {
  const id = useId();
  // Local text so the field can be cleared while typing.
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  // Weights can step by 2.5, so allow decimals when the step isn't a whole number.
  const decimal = !Number.isInteger(step);

  return (
    <div className="stepper">
      <label className="stepper__label" htmlFor={id}>
        {label}
      </label>
      <div className="stepper__control">
        <button
          type="button"
          className="stepper__btn"
          aria-label={`Decrease ${label.toLowerCase()}`}
          onClick={() => onChange(clamp(value - step))}
          disabled={value <= min}
        >
          <Minus size={16} aria-hidden />
        </button>
        <input
          id={id}
          type="number"
          inputMode={decimal ? 'decimal' : 'numeric'}
          step="any"
          min={min}
          max={max}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const n = decimal ? Number.parseFloat(e.target.value) : Number.parseInt(e.target.value, 10);
            if (Number.isFinite(n)) onChange(clamp(n));
          }}
          onBlur={() => setText(String(value))}
        />
        <button
          type="button"
          className="stepper__btn"
          aria-label={`Increase ${label.toLowerCase()}`}
          onClick={() => onChange(clamp(value + step))}
          disabled={value >= max}
        >
          <Plus size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
