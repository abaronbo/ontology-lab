import { cardPhrase } from '../../model/cardinality';
import { edgeGeometry } from '../../model/geometry';
import type { OntoEdge, OntoNode } from '../../model/types';

interface Props {
  edge: OntoEdge;
  source: OntoNode | undefined;
  target: OntoNode | undefined;
  onSelect: () => void;
}

/** Label chip at the midpoint of a property edge, with an optional cardinality line. */
export function PropertyChip({ edge, source, target, onSelect }: Props) {
  if (!source || !target) return null;
  const g = edgeGeometry(source, target);
  const card = cardPhrase(edge);
  return (
    <div className="chip" style={{ left: g.mx, top: g.my }} onClick={onSelect}>
      <div>{edge.label}</div>
      {card && <div className="chip__card">{card}</div>}
    </div>
  );
}
