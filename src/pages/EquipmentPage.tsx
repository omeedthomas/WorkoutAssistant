import { useMemo } from 'react';
import { Check, Home, Wrench } from 'lucide-react';
import { exercises, type Equipment } from '../data';
import { equipmentGroups, equipmentList, HOUSEHOLD } from '../data/equipment';
import { accessTo } from '../lib/equipment';
import { useProgress } from '../state/ProgressContext';

/** Choose the equipment you have; workouts and skill details adapt to it. Each tap saves. */
export function EquipmentPage() {
  const { state, setEquipment } = useProgress();
  const have = state.equipment?.have ?? null;
  const owned = new Set(have ?? []);

  const toggle = (e: Equipment) => {
    const next = new Set(owned);
    if (next.has(e)) next.delete(e);
    else next.add(e);
    setEquipment(equipmentList.map((d) => d.id).filter((id) => next.has(id)));
  };

  const counts = useMemo(() => {
    let ready = 0;
    let substitute = 0;
    for (const e of exercises) {
      const a = accessTo(e, have ?? []);
      if (a.kind === 'ready') ready++;
      else if (a.kind === 'substitute') substitute++;
    }
    return { ready, substitute, missing: exercises.length - ready - substitute };
  }, [have]);

  return (
    <div className="page page--narrow equipment-page">
      <header className="page-header">
        <h1>Your equipment</h1>
        <p className="muted">
          Tick what you have. Workouts only include exercises you can do, use household stand-ins where they work (like
          chairs for dips), and swap in alternatives where they don't.
        </p>
      </header>

      {have === null && (
        <p className="callout callout--muted small">
          You haven't set your equipment yet, so nothing is filtered out. Tap what you have below (or "I don't have any of
          these").
        </p>
      )}

      <section className="card equipment-summary" aria-live="polite">
        <p>
          <strong>{counts.ready + counts.substitute}</strong> of {exercises.length} exercises are possible
          {have === null ? ' once you choose' : ''}
          {counts.substitute > 0 && have !== null ? `, ${counts.substitute} of them with a household stand-in` : ''}.
        </p>
        {have !== null && counts.missing > 0 && (
          <p className="muted small">
            The other {counts.missing} need equipment you don't have; workouts swap them for alternatives.
          </p>
        )}
        <p className="muted small equipment-summary__household">
          <Home size={14} aria-hidden /> Always assumed: {HOUSEHOLD.toLowerCase()}.
        </p>
      </section>

      {equipmentGroups.map((group) => (
        <section key={group} className="card equipment-group">
          <h2>{group}</h2>
          <div className="equipment-grid" role="group" aria-label={group}>
            {equipmentList
              .filter((d) => d.group === group)
              .map((d) => (
                <button key={d.id} className="equipment-option" aria-pressed={owned.has(d.id)} onClick={() => toggle(d.id)}>
                  <span className="equipment-option__check" aria-hidden>
                    {owned.has(d.id) ? <Check size={14} /> : null}
                  </span>
                  <span className="equipment-option__text">
                    <strong>{d.name}</strong>
                    <span className="muted small">{d.description}</span>
                  </span>
                </button>
              ))}
          </div>
        </section>
      ))}

      <div className="button-row">
        <button className="btn" onClick={() => setEquipment([])}>
          <Wrench size={16} aria-hidden /> I don't have any of these
        </button>
        {have !== null && (
          <button className="link-btn" onClick={() => setEquipment(null)}>
            Stop filtering by equipment
          </button>
        )}
      </div>
    </div>
  );
}
