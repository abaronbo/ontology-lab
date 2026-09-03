// SHACL Turtle serializer. Each class is emitted as both rdfs:Class and sh:NodeShape (implicit class
// target); each property edge becomes a named sh:PropertyShape referenced from its domain class.

import { indexNodes } from '../model/derive';
import type { OntoEdge, OntoNode, Settings } from '../model/types';
import { annotationRows, basePrefix, customKeysOf, esc, headerLines, localName, statement } from './common';

/** sh:minCount / sh:maxCount rows. Reads the same fields as the OWL serializer: cardMin for exactly/min/max, cardMax only for range. */
export function countRows(e: OntoEdge): string[] {
  const min = Math.max(0, Number(e.cardMin ?? 1));
  const max = Math.max(0, Number(e.cardMax ?? 1));
  switch (e.cardMode) {
    case 'exactly':
      return [`sh:minCount ${min}`, `sh:maxCount ${min}`];
    case 'min':
      return [`sh:minCount ${min}`];
    case 'max':
      return [`sh:maxCount ${min}`];
    case 'range':
      return [`sh:minCount ${min}`, `sh:maxCount ${max}`];
    default:
      return [];
  }
}

/** `<Domain>-<property>Shape`, made unique with a numeric suffix when two edges would collide. */
function shapeName(source: OntoNode, e: OntoEdge, used: Set<string>): string {
  const base = `${localName(source)}-${localName(e)}Shape`;
  let name = base;
  for (let i = 2; used.has(name); i++) name = `${base}-${i}`;
  used.add(name);
  return name;
}

export function buildShacl(nodes: OntoNode[], edges: OntoEdge[], settings: Settings): string {
  const prefix = basePrefix(settings);
  const lines: string[] = headerLines(settings, ['rdf', 'rdfs', 'sh', 'skos', 'xsd']);
  const byId = indexNodes(nodes);
  const customKeys = customKeysOf(settings);

  // Resolve every edge once. Edges with a missing endpoint, or a non-class source, are skipped (as in OWL).
  const parentsOf: Record<string, string[]> = {};
  const shapesOf: Record<string, string[]> = {};
  const shapeBlocks: string[] = [];
  const propertyBlocks: string[] = [];
  const used = new Set<string>();

  for (const e of edges) {
    const s = byId[e.source];
    const t = byId[e.target];
    if (!s || !t || s.type !== 'class') continue;
    if (e.kind === 'subClassOf') {
      if (t.type === 'class') (parentsOf[s.id] ??= []).push(`${prefix}:${localName(t)}`);
      continue;
    }
    const name = shapeName(s, e, used);
    (shapesOf[s.id] ??= []).push(`${prefix}:${name}`);

    const rows = [`sh:path ${prefix}:${localName(e)}`];
    if (e.label) rows.push(`sh:name "${esc(e.label)}"`);
    const description = e.definition || e.comment;
    if (description) rows.push(`sh:description "${esc(description)}"`);
    rows.push(e.kind === 'datatypeProperty' ? `sh:datatype xsd:${t.datatype || 'string'}` : `sh:class ${prefix}:${localName(t)}`);
    rows.push(...countRows(e));
    shapeBlocks.push(statement(`${prefix}:${name} a sh:PropertyShape`, rows));

    propertyBlocks.push(statement(`${prefix}:${localName(e)} a rdf:Property`, annotationRows(e, customKeys)));
  }

  for (const n of nodes) {
    if (n.type !== 'class') continue;
    const rows = [...annotationRows(n, customKeys)];
    for (const parent of parentsOf[n.id] ?? []) rows.push(`rdfs:subClassOf ${parent}`);
    const shapes = shapesOf[n.id] ?? [];
    if (shapes.length) rows.push(`sh:property ${shapes.join(', ')}`);
    lines.push(statement(`${prefix}:${localName(n)} a rdfs:Class, sh:NodeShape`, rows));
  }
  if (shapeBlocks.length) lines.push('', ...shapeBlocks);
  if (propertyBlocks.length) lines.push('', ...propertyBlocks);
  return lines.join('\n');
}
