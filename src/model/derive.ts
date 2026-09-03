import { cardPhrase } from './cardinality';
import type { OntoEdge, OntoNode } from './types';

export type NodeIndex = Record<string, OntoNode>;

export function indexNodes(nodes: OntoNode[]): NodeIndex {
  const byId: NodeIndex = {};
  for (const n of nodes) byId[n.id] = n;
  return byId;
}

export interface ClassTreeRow {
  node: OntoNode;
  depth: number;
}

/** Class rows nested by rdfs:subClassOf. Multi-parent classes appear under each parent. Cycle-safe, depth <= 8. */
export function buildClassTree(nodes: OntoNode[], edges: OntoEdge[]): ClassTreeRow[] {
  const classes = nodes.filter((n) => n.type === 'class');
  const byId = indexNodes(classes);
  const parents: Record<string, string[]> = {};
  const children: Record<string, string[]> = {};
  for (const e of edges) {
    if (e.kind !== 'subClassOf' || !byId[e.source] || !byId[e.target]) continue;
    (parents[e.source] ??= []).push(e.target);
    (children[e.target] ??= []).push(e.source);
  }
  const rows: ClassTreeRow[] = [];
  const walk = (id: string, depth: number, seen: Set<string>) => {
    const n = byId[id];
    if (!n || seen.has(id) || depth > 8) return;
    rows.push({ node: n, depth });
    const next = new Set(seen);
    next.add(id);
    for (const cid of children[id] ?? []) walk(cid, depth + 1, next);
  };
  for (const c of classes) if (!parents[c.id]?.length) walk(c.id, 0, new Set());
  // classes trapped in a cycle have no root; list them flat
  for (const c of classes) if (!rows.some((r) => r.node.id === c.id)) rows.push({ node: c, depth: 0 });
  return rows;
}

export function propertyEdges(edges: OntoEdge[]): OntoEdge[] {
  return edges.filter((e) => e.kind !== 'subClassOf');
}

export interface FilteredGraph {
  nodes: OntoNode[];
  edges: OntoEdge[];
}

/** Checked classes form a focus set: show them, their direct neighbours, and edges touching a focused class. */
export function applyFocus(nodes: OntoNode[], edges: OntoEdge[], focusIds: string[]): FilteredGraph {
  if (!focusIds.length) return { nodes, edges };
  const keep = new Set(focusIds);
  for (const e of edges) {
    if (focusIds.includes(e.source)) keep.add(e.target);
    if (focusIds.includes(e.target)) keep.add(e.source);
  }
  const shownNodes = nodes.filter((n) => keep.has(n.id));
  const shownIds = new Set(shownNodes.map((n) => n.id));
  const shownEdges = edges.filter(
    (e) => (focusIds.includes(e.source) || focusIds.includes(e.target)) && shownIds.has(e.source) && shownIds.has(e.target),
  );
  return { nodes: shownNodes, edges: shownEdges };
}

export interface RelationRow {
  edgeId: string;
  text: string;
  detail: string;
}

export function relationRowsForNode(node: OntoNode, edges: OntoEdge[], byId: NodeIndex): RelationRow[] {
  const rows: RelationRow[] = [];
  const withCard = (base: string, e: OntoEdge) => {
    const card = cardPhrase(e);
    return card ? `${base} · ${card}` : base;
  };
  if (node.type === 'literal') {
    for (const e of edges) {
      if (e.target !== node.id) continue;
      const s = byId[e.source];
      if (!s) continue;
      rows.push({ edgeId: e.id, text: `${s.label} → ${e.label ?? ''}`, detail: withCard('Datatype property', e) });
    }
    return rows;
  }
  for (const e of edges) {
    const s = byId[e.source];
    const t = byId[e.target];
    if (!s || !t) continue;
    if (e.kind === 'subClassOf' && e.source === node.id) {
      rows.push({ edgeId: e.id, text: `is a ${t.label}`, detail: 'rdfs:subClassOf' });
    } else if (e.kind === 'subClassOf' && e.target === node.id) {
      rows.push({ edgeId: e.id, text: `${s.label} is a ${node.label}`, detail: 'subclass of this class' });
    } else if (e.source === node.id) {
      const range = e.kind === 'datatypeProperty' ? `xsd:${t.datatype ?? 'string'}` : t.label;
      const kindLabel = e.kind === 'datatypeProperty' ? 'Datatype property' : 'Object property';
      rows.push({ edgeId: e.id, text: `${e.label ?? ''} → ${range}`, detail: withCard(kindLabel, e) });
    } else if (e.target === node.id) {
      rows.push({ edgeId: e.id, text: `${s.label} → ${e.label ?? ''} → this class`, detail: withCard('Incoming object property', e) });
    }
  }
  return rows;
}

const CURIE = /^[A-Za-z_][\w.-]*:[\w.-]+$/;

/** Custom annotation properties from Settings: invalid entries ignored, duplicates dropped. */
export function customAnnotationKeys(entries: string[]): string[] {
  const keys: string[] = [];
  for (const raw of entries) {
    const k = raw.trim();
    if (CURIE.test(k) && !keys.includes(k)) keys.push(k);
  }
  return keys;
}

export function isValidCurie(s: string): boolean {
  return CURIE.test(s.trim());
}

export function rangeLabel(e: OntoEdge, target: OntoNode | undefined): string {
  if (e.kind === 'datatypeProperty') return `xsd:${target?.datatype ?? 'string'}`;
  return target?.label ?? '';
}
