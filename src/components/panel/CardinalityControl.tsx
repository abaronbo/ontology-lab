import { cardSentence, clampCard } from '../../model/cardinality';
import { rangeLabel } from '../../model/derive';
import { useStore } from '../../model/StoreContext';
import type { CardMode, OntoEdge, OntoNode } from '../../model/types';
import { Field } from '../ui/Field';

interface Props {
  edge: OntoEdge;
  source: OntoNode | undefined;
  target: OntoNode | undefined;
}

const MODES: { value: CardMode; label: string }[] = [
  { value: 'any', label: 'Any number (no restriction)' },
  { value: 'exactly', label: 'Exactly' },
  { value: 'min', label: 'At least' },
  { value: 'max', label: 'At most' },
  { value: 'range', label: 'Between' },
];

/** Domain/range chips plus the plain-language "How many?" cardinality control for a property edge. */
export function CardinalityControl({ edge, source, target }: Props) {
  const { dispatch } = useStore();
  const mode = edge.cardMode ?? 'any';
  const view: OntoEdge = { ...edge, cardMode: mode, cardMin: edge.cardMin ?? 1, cardMax: edge.cardMax ?? 1 };
  return (
    <div>
      <div className="domain-range">
        <Field label="Domain">
          <div className="statement domain-range__value">{source?.label ?? ''}</div>
        </Field>
        <Field label="Range">
          <div className="statement domain-range__value">{rangeLabel(edge, target)}</div>
        </Field>
      </div>
      <div className="section-heading">How many?</div>
      <select
        className="select"
        aria-label="Cardinality mode"
        value={mode}
        onChange={(e) => dispatch({ type: 'setCardMode', id: edge.id, mode: e.target.value as CardMode })}
      >
        {MODES.map((m) => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>
      {mode !== 'any' && (
        <div className="card-numbers">
          <input
            type="number"
            min={0}
            className="input"
            aria-label={mode === 'range' ? 'Minimum' : 'Count'}
            value={view.cardMin}
            onChange={(e) => dispatch({ type: 'setCardMin', id: edge.id, value: clampCard(e.target.value) })}
          />
          {mode === 'range' && (
            <>
              <span className="card-numbers__and">and</span>
              <input
                type="number"
                min={0}
                className="input"
                aria-label="Maximum"
                value={view.cardMax}
                onChange={(e) => dispatch({ type: 'setCardMax', id: edge.id, value: clampCard(e.target.value) })}
              />
            </>
          )}
        </div>
      )}
      <div className="statement card-sentence">{cardSentence(view, source, target)}</div>
    </div>
  );
}
