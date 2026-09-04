// Turtle importer: the inverse of turtle.ts / shacl.ts. Pure function, no React, no DOM.
// Reads either an OWL or a SHACL export (or a hand-written file following the same shape) and
// rebuilds the graph model. Unexpected RDF shapes become warnings; only unparseable Turtle and the
// 5 MB input cap throw ImportError.

import { Parser, type Quad } from 'n3';
import { customAnnotationKeys, isValidCurie } from '../model/derive';
import type { Counters, OntoEdge, OntoNode, PrefixEntry, Settings, XsdDatatype } from '../model/types';
import { CANVAS_SIZE, XSD_DATATYPES } from '../model/types';

export class ImportError extends Error {}

export interface ImportResult {
  nodes: OntoNode[];
  edges: OntoEdge[];
  settings: Settings;
  counters: Counters;
  warnings: string[];
}

const NS = {
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  owl: 'http://www.w3.org/2002/07/owl#',
  sh: 'http://www.w3.org/ns/shacl#',
  skos: 'http://www.w3.org/2004/02/skos/core#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
};
const VOCAB_NS = [NS.rdf, NS.rdfs, NS.owl, NS.sh, NS.skos, NS.xsd];
const VOCAB_PREFIX_NAMES = new Set(['rdf', 'rdfs', 'owl', 'sh', 'skos', 'xsd']);
const CLASS_TYPES = new Set([`${NS.owl}Class`, `${NS.rdfs}Class`, `${NS.sh}NodeShape`]);
const MAX_BYTES = 5 * 1024 * 1024;
// eslint-disable-next-line no-control-regex -- intentionally matches control characters to normalize them
const CONTROL_CHARS = /[\r\n\t\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

function isVocabPredicate(pred: string): boolean {
  return VOCAB_NS.some((ns) => pred.startsWith(ns));
}

/** Local name for a resource IRI: strip the base namespace, else the last '#'/'/' segment. */
function localPart(iri: string, baseNamespace: string): string {
  if (baseNamespace && iri.startsWith(baseNamespace)) return iri.slice(baseNamespace.length);
  const idx = Math.max(iri.lastIndexOf('#'), iri.lastIndexOf('/'));
  return idx >= 0 ? iri.slice(idx + 1) : iri;
}

function subjectKey(t: { termType: string; value: string }): string {
  return `${t.termType}:${t.value}`;
}

/** Control chars normalized to a single space, with one warning per subject. */
function sanitize(value: string, subjectIri: string, warnedSubjects: Set<string>, warnings: string[]): string {
  if (!CONTROL_CHARS.test(value)) return value;
  if (!warnedSubjects.has(subjectIri)) {
    warnedSubjects.add(subjectIri);
    warnings.push(`Control characters normalized to spaces in a literal on <${subjectIri}>.`);
  }
  return value.replace(new RegExp(CONTROL_CHARS.source, 'g'), ' ');
}

interface CurieCandidate {
  prefix: string;
  iri: string;
}

interface AnnotationBag {
  label: string;
  prefLabel: string;
  altLabel: string;
  definition: string;
  comment: string;
  custom: Record<string, string>;
}

/** Reads rdfs:label/skos:prefLabel/skos:altLabel/skos:definition/rdfs:comment plus custom annotations
 *  off one subject's own quads. Discovers new custom CURIEs in document order as it goes. */
function collectAnnotations(
  subjectIri: string,
  subQuads: Quad[],
  curieCandidates: CurieCandidate[],
  discoveredOrder: string[],
  discoveredSet: Set<string>,
  warnedControlSubjects: Set<string>,
  warnings: string[],
): AnnotationBag {
  let label = '';
  let prefLabel = '';
  let definition = '';
  let comment = '';
  const altValues: string[] = [];
  const custom: Record<string, string> = {};
  for (const q of subQuads) {
    if (q.object.termType !== 'Literal') continue;
    const pred = q.predicate.value;
    const value = sanitize(q.object.value, subjectIri, warnedControlSubjects, warnings);
    if (pred === `${NS.rdfs}label`) { label = value; continue; }
    if (pred === `${NS.skos}prefLabel`) { prefLabel = value; continue; }
    if (pred === `${NS.skos}altLabel`) { altValues.push(value); continue; }
    if (pred === `${NS.skos}definition`) { definition = value; continue; }
    if (pred === `${NS.rdfs}comment`) { comment = value; continue; }
    if (isVocabPredicate(pred)) continue;
    const match = curieCandidates.find((c) => pred.startsWith(c.iri));
    if (!match) {
      warnings.push(`Skipped a literal with no declared prefix for predicate <${pred}>.`);
      continue;
    }
    const curie = `${match.prefix}:${pred.slice(match.iri.length)}`;
    if (!isValidCurie(curie)) {
      warnings.push(`Skipped invalid custom annotation key "${curie}".`);
      continue;
    }
    if (!discoveredSet.has(curie)) {
      discoveredSet.add(curie);
      discoveredOrder.push(curie);
    }
    custom[curie] = value;
  }
  return { label, prefLabel, altLabel: altValues.filter(Boolean).join(', '), definition, comment, custom };
}

function resolveDatatype(iri: string, propLocalName: string, warnings: string[]): XsdDatatype {
  if (iri.startsWith(NS.xsd)) {
    const local = iri.slice(NS.xsd.length);
    if ((XSD_DATATYPES as string[]).includes(local)) return local as XsdDatatype;
  }
  warnings.push(`Property "${propLocalName}" has an unsupported datatype <${iri}>; using xsd:string.`);
  return 'string';
}

type CardAcc = { exact?: number; min?: number; max?: number };

/** exactly/min/max/range/any from an accumulated restriction (mirrors the exporters' cardMin/cardMax use). */
function cardFromAcc(acc: CardAcc | undefined): Pick<OntoEdge, 'cardMode' | 'cardMin' | 'cardMax'> {
  if (!acc) return { cardMode: 'any', cardMin: 1, cardMax: 1 };
  if (acc.exact !== undefined) return { cardMode: 'exactly', cardMin: acc.exact, cardMax: acc.exact };
  if (acc.min !== undefined && acc.max === undefined) return { cardMode: 'min', cardMin: acc.min, cardMax: acc.min };
  if (acc.max !== undefined && acc.min === undefined) return { cardMode: 'max', cardMin: acc.max, cardMax: acc.max };
  if (acc.min !== undefined && acc.max !== undefined) return { cardMode: 'range', cardMin: acc.min, cardMax: acc.max };
  return { cardMode: 'any', cardMin: 1, cardMax: 1 };
}

/** cardMode/cardMin/cardMax from sh:minCount/sh:maxCount (mirrors countRows in shacl.ts). */
function cardFromCounts(min: number | undefined, max: number | undefined): Pick<OntoEdge, 'cardMode' | 'cardMin' | 'cardMax'> {
  if (min !== undefined && max !== undefined && min === max) return { cardMode: 'exactly', cardMin: min, cardMax: min };
  if (min !== undefined && max === undefined) return { cardMode: 'min', cardMin: min, cardMax: min };
  if (max !== undefined && min === undefined) return { cardMode: 'max', cardMin: max, cardMax: max };
  if (min !== undefined && max !== undefined) return { cardMode: 'range', cardMin: min, cardMax: max };
  return { cardMode: 'any', cardMin: 1, cardMax: 1 };
}

interface ClassNodeRaw {
  tempId: string;
  iri: string;
  fullIri: string;
}

interface LiteralNodeRaw {
  tempId: string;
  label: string;
  datatype: XsdDatatype;
}

interface PropertyEdgeRaw {
  tempId: string;
  source: string; // temp node id
  target: string; // temp node id
  kind: 'objectProperty' | 'datatypeProperty';
  iri: string;
  propIri: string; // full IRI of the property subject, for annotation lookup
  cardMode: OntoEdge['cardMode'];
  cardMin: number;
  cardMax: number;
  // SHACL-only fallbacks, read from the property shape (ignored when the property itself has the field)
  shapeName?: string;
  shapeDescription?: string;
}

export function importTurtle(text: string, current: Settings): ImportResult {
  if (new TextEncoder().encode(text).length > MAX_BYTES) {
    throw new ImportError('File is too large (over 5 MB).');
  }

  const prefixMap: Record<string, string> = {};
  let quads: Quad[];
  try {
    quads = new Parser({ format: 'text/turtle' }).parse(text, null, (prefix, iri) => {
      prefixMap[prefix] = iri.value;
    });
  } catch (e) {
    throw new ImportError(e instanceof Error ? e.message : 'Could not parse Turtle.');
  }

  const warnings: string[] = [];
  const bySubject = new Map<string, Quad[]>();
  for (const q of quads) {
    const k = subjectKey(q.subject);
    const arr = bySubject.get(k);
    if (arr) arr.push(q);
    else bySubject.set(k, [q]);
  }
  const subQuadsOf = (iri: string) => bySubject.get(`NamedNode:${iri}`) ?? [];

  // --- b. Base namespace -----------------------------------------------------------------
  let basePrefixName: string | undefined;
  let baseNamespace: string | undefined;
  for (const [p, iri] of Object.entries(prefixMap)) {
    if (iri === current.namespace) { basePrefixName = p; baseNamespace = iri; break; }
  }
  if (!baseNamespace) {
    for (const [p, iri] of Object.entries(prefixMap)) {
      if (!VOCAB_PREFIX_NAMES.has(p)) { basePrefixName = p; baseNamespace = iri; break; }
    }
  }
  if (!baseNamespace) {
    for (const q of quads) {
      if (q.predicate.value !== `${NS.rdf}type` || q.subject.termType !== 'NamedNode' || !CLASS_TYPES.has(q.object.value)) continue;
      const iri = q.subject.value;
      const idx = Math.max(iri.lastIndexOf('#'), iri.lastIndexOf('/'));
      if (idx >= 0) {
        baseNamespace = iri.slice(0, idx + 1);
        const declared = Object.entries(prefixMap).find(([, i]) => i === baseNamespace);
        basePrefixName = declared?.[0] ?? current.prefix ?? 'ex';
      }
      break;
    }
  }
  if (!baseNamespace) { baseNamespace = current.namespace; basePrefixName = current.prefix || 'ex'; }
  const ns = baseNamespace;
  const localName = (iri: string) => localPart(iri, ns);

  const otherPrefixes: PrefixEntry[] = [];
  for (const [p, iri] of Object.entries(prefixMap)) {
    if (p === basePrefixName || VOCAB_PREFIX_NAMES.has(p)) continue;
    otherPrefixes.push({ prefix: p, iri });
  }
  const extraPrefixes: PrefixEntry[] = [...current.extraPrefixes];
  const extraNames = new Set(extraPrefixes.map((e) => e.prefix));
  for (const { prefix, iri } of otherPrefixes) {
    if (extraNames.has(prefix)) continue;
    extraPrefixes.push({ prefix, iri });
    extraNames.add(prefix);
  }
  const curieCandidates: CurieCandidate[] = [{ prefix: basePrefixName!, iri: ns }, ...otherPrefixes].sort(
    (a, b) => b.iri.length - a.iri.length,
  );

  // --- c. Classes --------------------------------------------------------------------------
  const classOrder: string[] = [];
  const classSet = new Set<string>();
  const warnedForeignClasses = new Set<string>();
  for (const q of quads) {
    if (q.predicate.value !== `${NS.rdf}type` || !CLASS_TYPES.has(q.object.value)) continue;
    if (q.subject.termType !== 'NamedNode') continue; // blank-node classes ignored
    const iri = q.subject.value;
    if (!iri.startsWith(ns)) {
      if (!warnedForeignClasses.has(iri)) {
        warnedForeignClasses.add(iri);
        warnings.push(`Skipped class outside the base namespace: <${iri}>.`);
      }
      continue;
    }
    if (!classSet.has(iri)) { classSet.add(iri); classOrder.push(iri); }
  }
  const classTempId = new Map<string, string>();
  const classNodesRaw: ClassNodeRaw[] = classOrder.map((iri, i) => {
    const tempId = `c${i}`;
    classTempId.set(iri, tempId);
    return { tempId, iri: localName(iri), fullIri: iri };
  });

  // --- d. Subclass edges + restriction records ---------------------------------------------
  const subclassPairs: { source: string; target: string }[] = []; // temp ids
  const seenPairs = new Set<string>();
  const restrictions = new Map<string, CardAcc>(); // key: `${classIri}|${propLocalName}`
  const warnOnce = (key: string, msg: string, seen: Set<string>) => {
    if (seen.has(key)) return;
    seen.add(key);
    warnings.push(msg);
  };
  const dupRestrictionWarned = new Set<string>();
  for (const q of quads) {
    if (q.predicate.value !== `${NS.rdfs}subClassOf`) continue;
    if (q.subject.termType !== 'NamedNode' || !classSet.has(q.subject.value)) continue;
    const o = q.object;
    if (o.termType === 'NamedNode') {
      if (!classSet.has(o.value)) continue;
      const key = `${q.subject.value}|${o.value}`;
      if (!seenPairs.has(key)) {
        seenPairs.add(key);
        subclassPairs.push({ source: classTempId.get(q.subject.value)!, target: classTempId.get(o.value)! });
      }
      continue;
    }
    if (o.termType !== 'BlankNode') continue;
    const bnQuads = bySubject.get(`BlankNode:${o.value}`) ?? [];
    if (!bnQuads.some((q2) => q2.predicate.value === `${NS.rdf}type` && q2.object.value === `${NS.owl}Restriction`)) continue;
    const onProp = bnQuads.find((q2) => q2.predicate.value === `${NS.owl}onProperty`);
    if (!onProp) continue;
    const propLocal = localName(onProp.object.value);
    const key = `${q.subject.value}|${propLocal}`;
    const acc: CardAcc = restrictions.get(key) ?? {};
    restrictions.set(key, acc);
    const setOnce = (field: keyof CardAcc, n: number, kindLabel: string) => {
      if (acc[field] !== undefined) {
        warnOnce(`${key}|${field}`, `Duplicate ${kindLabel} restriction for "${propLocal}" on "${localName(q.subject.value)}"; keeping the first.`, dupRestrictionWarned);
        return;
      }
      acc[field] = n;
    };
    for (const q2 of bnQuads) {
      if (q2.predicate.value === `${NS.owl}qualifiedCardinality`) setOnce('exact', Number(q2.object.value), 'qualifiedCardinality');
      else if (q2.predicate.value === `${NS.owl}minQualifiedCardinality`) setOnce('min', Number(q2.object.value), 'minQualifiedCardinality');
      else if (q2.predicate.value === `${NS.owl}maxQualifiedCardinality`) setOnce('max', Number(q2.object.value), 'maxQualifiedCardinality');
    }
  }

  const literalNodesRaw: LiteralNodeRaw[] = [];
  const newLiteralNode = (label: string, datatype: XsdDatatype): string => {
    const tempId = `l${literalNodesRaw.length}`;
    literalNodesRaw.push({ tempId, label, datatype });
    return tempId;
  };

  // --- e. OWL properties ---------------------------------------------------------------------
  const owlPropTypes = new Set([`${NS.owl}ObjectProperty`, `${NS.owl}DatatypeProperty`]);
  const owlPropOrder: string[] = [];
  const owlPropSeen = new Set<string>();
  for (const q of quads) {
    if (q.predicate.value !== `${NS.rdf}type`) continue;
    if (q.subject.termType !== 'NamedNode') continue;
    const iri = q.subject.value;
    const isOwlProp = owlPropTypes.has(q.object.value);
    const isRdfProp = q.object.value === `${NS.rdf}Property`;
    if (!isOwlProp && !isRdfProp) continue;
    if (isRdfProp && !subQuadsOf(iri).some((q2) => q2.predicate.value === `${NS.rdfs}range`)) continue;
    if (!owlPropSeen.has(iri)) { owlPropSeen.add(iri); owlPropOrder.push(iri); }
  }

  const owlEdgesRaw: PropertyEdgeRaw[] = [];
  const owlResolvedPropIris: string[] = [];
  for (const propIri of owlPropOrder) {
    const subQuads = subQuadsOf(propIri);
    const propLocal = localName(propIri);
    const domains = subQuads.filter((q) => q.predicate.value === `${NS.rdfs}domain`).map((q) => q.object.value);
    const ranges = subQuads.filter((q) => q.predicate.value === `${NS.rdfs}range`).map((q) => q.object.value);
    if (!domains.length) continue;
    if (domains.length > 1) warnings.push(`Property "${propLocal}" has more than one rdfs:domain; using the first.`);
    if (ranges.length > 1) warnings.push(`Property "${propLocal}" has more than one rdfs:range; using the first.`);
    const domainIri = domains[0];
    if (!classSet.has(domainIri)) continue; // domain not an imported class
    if (!ranges.length) continue;
    const rangeIri = ranges[0];

    let kind: 'objectProperty' | 'datatypeProperty';
    let targetTempId: string;
    if (classSet.has(rangeIri)) {
      kind = 'objectProperty';
      targetTempId = classTempId.get(rangeIri)!;
    } else if (rangeIri.startsWith(NS.xsd)) {
      kind = 'datatypeProperty';
      const datatype = resolveDatatype(rangeIri, propLocal, warnings);
      targetTempId = newLiteralNode(propLocal, datatype);
    } else {
      warnings.push(`Property "${propLocal}" has an unsupported range <${rangeIri}>; skipped.`);
      continue;
    }
    const card = cardFromAcc(restrictions.get(`${domainIri}|${propLocal}`));
    owlEdgesRaw.push({
      tempId: `ow${owlEdgesRaw.length}`,
      source: classTempId.get(domainIri)!,
      target: targetTempId,
      kind,
      iri: propLocal,
      propIri,
      cardMode: card.cardMode,
      cardMin: card.cardMin ?? 1,
      cardMax: card.cardMax ?? 1,
    });
    owlResolvedPropIris.push(propIri);
  }

  // --- f. SHACL properties -------------------------------------------------------------------
  const shapeOrder: string[] = [];
  const shapeSeen = new Set<string>();
  for (const q of quads) {
    if (q.predicate.value !== `${NS.sh}path`) continue;
    if (q.subject.termType !== 'NamedNode') continue;
    if (!shapeSeen.has(q.subject.value)) { shapeSeen.add(q.subject.value); shapeOrder.push(q.subject.value); }
  }
  const shapeReferencedBy = new Map<string, string[]>();
  for (const q of quads) {
    if (q.predicate.value !== `${NS.sh}property`) continue;
    if (q.subject.termType !== 'NamedNode') continue;
    const arr = shapeReferencedBy.get(q.object.value) ?? [];
    arr.push(q.subject.value);
    shapeReferencedBy.set(q.object.value, arr);
  }

  const shaclEdgesRaw: PropertyEdgeRaw[] = [];
  const shaclResolvedPropIris: string[] = [];
  for (const shapeIri of shapeOrder) {
    const subQuads = subQuadsOf(shapeIri);
    if (!subQuads.some((q) => q.predicate.value === `${NS.rdf}type` && q.object.value === `${NS.sh}PropertyShape`)) continue;
    const pathQuad = subQuads.find((q) => q.predicate.value === `${NS.sh}path`);
    if (!pathQuad || pathQuad.object.termType !== 'NamedNode') continue;
    const propIri = pathQuad.object.value;
    const propLocal = localName(propIri);
    const referencing = (shapeReferencedBy.get(shapeIri) ?? []).filter((c) => classSet.has(c));
    if (referencing.length !== 1) {
      warnings.push(
        referencing.length === 0
          ? `Property shape for "${propLocal}" is not referenced by any imported class; skipped.`
          : `Property shape for "${propLocal}" is referenced by more than one class; skipped.`,
      );
      continue;
    }
    const sourceIri = referencing[0];

    const classQuad = subQuads.find((q) => q.predicate.value === `${NS.sh}class`);
    const datatypeQuad = subQuads.find((q) => q.predicate.value === `${NS.sh}datatype`);
    let kind: 'objectProperty' | 'datatypeProperty';
    let targetTempId: string;
    if (classQuad) {
      if (!classSet.has(classQuad.object.value)) {
        warnings.push(`Property shape for "${propLocal}" targets a class that was not imported; skipped.`);
        continue;
      }
      kind = 'objectProperty';
      targetTempId = classTempId.get(classQuad.object.value)!;
    } else if (datatypeQuad) {
      kind = 'datatypeProperty';
      const datatype = resolveDatatype(datatypeQuad.object.value, propLocal, warnings);
      targetTempId = newLiteralNode(propLocal, datatype);
    } else {
      warnings.push(`Property shape for "${propLocal}" has neither sh:class nor sh:datatype; skipped.`);
      continue;
    }

    const minQuad = subQuads.find((q) => q.predicate.value === `${NS.sh}minCount`);
    const maxQuad = subQuads.find((q) => q.predicate.value === `${NS.sh}maxCount`);
    const card = cardFromCounts(
      minQuad ? Number(minQuad.object.value) : undefined,
      maxQuad ? Number(maxQuad.object.value) : undefined,
    );
    const nameQuad = subQuads.find((q) => q.predicate.value === `${NS.sh}name` && q.object.termType === 'Literal');
    const descQuad = subQuads.find((q) => q.predicate.value === `${NS.sh}description` && q.object.termType === 'Literal');
    shaclEdgesRaw.push({
      tempId: `sh${shaclEdgesRaw.length}`,
      source: classTempId.get(sourceIri)!,
      target: targetTempId,
      kind,
      iri: propLocal,
      propIri,
      cardMode: card.cardMode,
      cardMin: card.cardMin ?? 1,
      cardMax: card.cardMax ?? 1,
      shapeName: nameQuad?.object.value,
      shapeDescription: descQuad?.object.value,
    });
    shaclResolvedPropIris.push(propIri);
  }

  // --- g. Annotations --------------------------------------------------------------------------
  const discoveredOrder: string[] = [];
  const discoveredSet = new Set<string>();
  const warnedControlSubjects = new Set<string>();

  const classAnnotations = new Map<string, AnnotationBag>();
  for (const iri of classOrder) {
    classAnnotations.set(
      iri,
      collectAnnotations(iri, subQuadsOf(iri), curieCandidates, discoveredOrder, discoveredSet, warnedControlSubjects, warnings),
    );
  }
  const propAnnotations = new Map<string, AnnotationBag>();
  for (const iri of [...owlResolvedPropIris, ...shaclResolvedPropIris]) {
    propAnnotations.set(
      iri,
      collectAnnotations(iri, subQuadsOf(iri), curieCandidates, discoveredOrder, discoveredSet, warnedControlSubjects, warnings),
    );
  }

  const mergedCustomKeys = [...current.customAnnotations];
  for (const k of discoveredOrder) if (!mergedCustomKeys.includes(k)) mergedCustomKeys.push(k);
  const customAnnotations = customAnnotationKeys(mergedCustomKeys);

  // --- Assemble class nodes (annotations; x/y filled in by the layout pass below) -------------
  const classNodes: (OntoNode & { tempId: string })[] = classNodesRaw.map((c) => {
    const a = classAnnotations.get(c.fullIri)!;
    return {
      tempId: c.tempId,
      id: '',
      type: 'class',
      x: 0,
      y: 0,
      iri: c.iri,
      label: a.label,
      prefLabel: a.prefLabel,
      altLabel: a.altLabel,
      definition: a.definition,
      comment: a.comment,
      ...(Object.keys(a.custom).length ? { custom: a.custom } : {}),
    };
  });

  // --- Assemble property edges (OWL + SHACL) ---------------------------------------------------
  const buildPropertyEdge = (raw: PropertyEdgeRaw): OntoEdge & { tempId: string } => {
    const a = propAnnotations.get(raw.propIri)!;
    const label = a.label || raw.shapeName || '';
    // sh:description mirrors (definition || comment) on export, so it is only a useful fallback
    // when P has neither of its own; otherwise it is redundant with what P already carries.
    const definition = a.definition || a.comment ? a.definition : raw.shapeDescription || '';
    return {
      tempId: raw.tempId,
      id: '',
      source: raw.source,
      target: raw.target,
      kind: raw.kind,
      iri: raw.iri,
      label,
      prefLabel: a.prefLabel,
      altLabel: a.altLabel,
      definition,
      comment: a.comment,
      cardMode: raw.cardMode,
      cardMin: raw.cardMin,
      cardMax: raw.cardMax,
      ...(Object.keys(a.custom).length ? { custom: a.custom } : {}),
    };
  };
  const propertyEdges = [...owlEdgesRaw, ...shaclEdgesRaw].map(buildPropertyEdge);

  // --- h. Layout: deterministic grid ------------------------------------------------------------
  const parentsOfTemp = new Map<string, string[]>();
  for (const { source, target } of subclassPairs) {
    const arr = parentsOfTemp.get(source) ?? [];
    arr.push(target);
    parentsOfTemp.set(source, arr);
  }
  const depthOf = new Map<string, number>();
  const resolveDepth = (id: string, seen: Set<string>): number => {
    if (depthOf.has(id)) return depthOf.get(id)!;
    if (seen.has(id) || seen.size > 8) { depthOf.set(id, 0); return 0; }
    const parents = parentsOfTemp.get(id) ?? [];
    if (!parents.length) { depthOf.set(id, 0); return 0; }
    const next = new Set(seen);
    next.add(id);
    const d = 1 + Math.max(...parents.map((p) => resolveDepth(p, next)));
    depthOf.set(id, d);
    return d;
  };
  for (const c of classNodes) resolveDepth(c.tempId, new Set());

  const ROW_H = 160;
  const COL_W = 240;
  const ORIGIN_X = 40;
  const ORIGIN_Y = 60;
  const COLS = 8;
  const byDepth = new Map<number, (OntoNode & { tempId: string })[]>();
  for (const c of classNodes) {
    const d = depthOf.get(c.tempId) ?? 0;
    const arr = byDepth.get(d) ?? [];
    arr.push(c);
    byDepth.set(d, arr);
  }
  let maxDepth = 0;
  for (const [d, arr] of byDepth) {
    maxDepth = Math.max(maxDepth, d);
    arr.sort((a, b) => a.label.localeCompare(b.label));
    arr.forEach((c, i) => {
      c.x = ORIGIN_X + (i % COLS) * COL_W;
      c.y = ORIGIN_Y + d * ROW_H + Math.floor(i / COLS) * ROW_H;
    });
  }
  const literalY = ORIGIN_Y + (maxDepth + 1) * ROW_H;
  const literalNodes: (OntoNode & { tempId: string })[] = literalNodesRaw.map((l, i) => ({
    tempId: l.tempId,
    id: '',
    type: 'literal',
    x: ORIGIN_X + (i % COLS) * COL_W,
    y: literalY + Math.floor(i / COLS) * ROW_H,
    label: l.label,
    datatype: l.datatype,
  }));
  for (const n of [...classNodes, ...literalNodes]) {
    n.x = Math.min(n.x, CANVAS_SIZE.w - 200);
    n.y = Math.min(n.y, CANVAS_SIZE.h - 100);
  }

  // --- i. Final ids: a single shared sequence, nodes first (classes then literals) then edges --
  let idCounter = 0;
  const tempToFinal = new Map<string, string>();
  const finalNodes: OntoNode[] = [];
  for (const n of [...classNodes, ...literalNodes]) {
    idCounter += 1;
    const id = `n${idCounter}`;
    tempToFinal.set(n.tempId, id);
    const { tempId: _tempId, ...rest } = n;
    finalNodes.push({ ...rest, id });
  }
  const finalEdges: OntoEdge[] = [];
  const subclassEdges = subclassPairs.map((p) => ({ source: p.source, target: p.target }));
  for (const p of subclassEdges) {
    idCounter += 1;
    finalEdges.push({ id: `e${idCounter}`, source: tempToFinal.get(p.source)!, target: tempToFinal.get(p.target)!, kind: 'subClassOf', comment: '' });
  }
  for (const e of propertyEdges) {
    idCounter += 1;
    const { tempId: _tempId, ...rest } = e;
    finalEdges.push({ ...rest, id: `e${idCounter}`, source: tempToFinal.get(e.source)!, target: tempToFinal.get(e.target)! });
  }

  const settings: Settings = { ...current, prefix: basePrefixName!, namespace: ns, extraPrefixes, customAnnotations };
  const counters: Counters = {
    id: idCounter,
    classes: classNodesRaw.length,
    literals: literalNodesRaw.length,
    properties: propertyEdges.length,
  };

  return { nodes: finalNodes, edges: finalEdges, settings, counters, warnings };
}
