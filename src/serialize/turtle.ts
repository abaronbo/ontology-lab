// OWL Turtle serializer. Ported from the prototype's buildTurtle / restrictionBlocks (the reference
// implementations); output is guarded byte-for-byte by `npm run parity`.

import { indexNodes } from '../model/derive';
import type { OntoEdge, OntoNode, Settings } from '../model/types';
import { annotationRows, basePrefix, customKeysOf, headerLines, localName } from './common';

/** Qualified cardinality restriction blocks on the domain class, one per OWL predicate. */
export function restrictionBlocks(e: OntoEdge, source: OntoNode, target: OntoNode, prefix: string): string[] {
  if (!e.cardMode || e.cardMode === 'any') return [];
  const rangeLine =
    e.kind === 'datatypeProperty'
      ? `owl:onDataRange xsd:${target.datatype || 'string'}`
      : `owl:onClass ${prefix}:${localName(target)}`;
  const min = Math.max(0, Number(e.cardMin ?? 1));
  const max = Math.max(0, Number(e.cardMax ?? 1));
  const block = (pred: string, n: number) =>
    `${prefix}:${localName(source)} rdfs:subClassOf [\n  a owl:Restriction ;\n  owl:onProperty ${prefix}:${localName(e)} ;\n  owl:${pred} "${n}"^^xsd:nonNegativeInteger ;\n  ${rangeLine}\n] .`;
  switch (e.cardMode) {
    case 'exactly':
      return [block('qualifiedCardinality', min)];
    case 'min':
      return [block('minQualifiedCardinality', min)];
    case 'max':
      return [block('maxQualifiedCardinality', min)];
    case 'range':
      return [block('minQualifiedCardinality', min), block('maxQualifiedCardinality', max)];
  }
}

export function buildTurtle(nodes: OntoNode[], edges: OntoEdge[], settings: Settings): string {
  const prefix = basePrefix(settings);
  const lines: string[] = headerLines(settings, ['owl', 'rdf', 'rdfs', 'skos', 'xsd']);
  const byId = indexNodes(nodes);
  const customKeys = customKeysOf(settings);

  for (const n of nodes) {
    if (n.type !== 'class') continue;
    const rows = annotationRows(n, customKeys);
    lines.push(`${prefix}:${localName(n)} a owl:Class ${rows.length ? ';\n  ' + rows.join(' ;\n  ') + ' .' : '.'}`);
  }
  for (const e of edges) {
    if (e.kind !== 'subClassOf') continue;
    const c = byId[e.source];
    const p = byId[e.target];
    if (c && p) lines.push(`${prefix}:${localName(c)} rdfs:subClassOf ${prefix}:${localName(p)} .`);
  }
  for (const e of edges) {
    if (e.kind === 'subClassOf') continue;
    const s = byId[e.source];
    const t = byId[e.target];
    if (!s || !t) continue;
    const owlType = e.kind === 'datatypeProperty' ? 'owl:DatatypeProperty' : 'owl:ObjectProperty';
    const range = e.kind === 'datatypeProperty' ? `xsd:${t.datatype || 'string'}` : `${prefix}:${localName(t)}`;
    const rows = [`rdfs:domain ${prefix}:${localName(s)}`, `rdfs:range ${range}`, ...annotationRows(e, customKeys)];
    lines.push(`${prefix}:${localName(e)} a ${owlType} ;\n  ${rows.join(' ;\n  ')} .`);
    lines.push(...restrictionBlocks(e, s, t, prefix));
  }
  return lines.join('\n');
}
