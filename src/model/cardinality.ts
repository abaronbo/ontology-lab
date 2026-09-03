import type { OntoEdge, OntoNode } from './types';

/** Friendly phrase for a property edge's cardinality, or '' when unrestricted. */
export function cardPhrase(e: Pick<OntoEdge, 'cardMode' | 'cardMin' | 'cardMax'>): string {
  const min = Number(e.cardMin ?? 1);
  const max = Number(e.cardMax ?? 1);
  switch (e.cardMode) {
    case 'exactly':
      return `exactly ${min}`;
    case 'min':
      return `at least ${min}`;
    case 'max':
      return `at most ${min}`;
    case 'range':
      return `between ${min} and ${max}`;
    default:
      return '';
  }
}

/** Plain-language sentence shown under the "How many?" control. */
export function cardSentence(e: OntoEdge, source: OntoNode | undefined, target: OntoNode | undefined): string {
  const words = cardPhrase(e);
  const subject = source ? source.label : 'instance';
  const rangeWord =
    e.kind === 'datatypeProperty' ? (target ? target.label : 'value') : target ? target.label : '';
  return words
    ? `Each ${subject} has ${words} ${rangeWord} via ${e.label ?? ''}.`
    : `No cardinality restriction: each ${subject} may have any number of ${rangeWord}.`;
}

/** Numbers entered in the panel are clamped to >= 0 and coerced to integers. */
export function clampCard(raw: string): number {
  return Math.max(0, parseInt(raw, 10) || 0);
}
