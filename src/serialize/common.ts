// Helpers shared by the OWL and SHACL serializers. Pure string building, no React.

import { customAnnotationKeys } from '../model/derive';
import type { PrefixEntry, Settings } from '../model/types';

export const esc = (s: string | undefined) => (s ?? '').replace(/"/g, '\\"');

/** Local name of a resource: the IRI field, falling back to the label (prototype behaviour, unsanitized). */
export const localName = (r: { iri?: string; label?: string }) => r.iri || r.label || '';

export const VOCAB_PREFIXES: Record<'owl' | 'rdf' | 'rdfs' | 'sh' | 'skos' | 'xsd', string> = {
  owl: '@prefix owl: <http://www.w3.org/2002/07/owl#> .',
  rdf: '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .',
  rdfs: '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .',
  sh: '@prefix sh: <http://www.w3.org/ns/shacl#> .',
  skos: '@prefix skos: <http://www.w3.org/2004/02/skos/core#> .',
  xsd: '@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .',
};

export function basePrefix(settings: Settings): string {
  return settings.prefix || 'ex';
}

/** One @prefix line per complete entry; surrounding angle brackets and trailing dots are tolerated. */
export function extraPrefixLines(entries: PrefixEntry[]): string[] {
  const lines: string[] = [];
  for (const { prefix, iri } of entries) {
    const p = prefix.trim();
    const i = iri.trim().replace(/^</, '').replace(/[<>.\s]*$/, '');
    if (/^[A-Za-z0-9_-]*$/.test(p) && i) lines.push(`@prefix ${p}: <${i}> .`);
  }
  return lines;
}

/** Turtle header: configured namespace, the requested vocabularies in the given order, extra prefixes, blank line. */
export function headerLines(settings: Settings, vocab: (keyof typeof VOCAB_PREFIXES)[]): string[] {
  return [
    `@prefix ${basePrefix(settings)}: <${settings.namespace || 'http://example.org/ontology#'}> .`,
    ...vocab.map((v) => VOCAB_PREFIXES[v]),
    ...extraPrefixLines(settings.extraPrefixes ?? []),
    '',
  ];
}

export interface Annotated {
  label?: string;
  prefLabel?: string;
  altLabel?: string;
  definition?: string;
  comment?: string;
  custom?: Record<string, string>;
}

/** `predicate "value"` rows for every non-empty annotation; altLabel splits on commas. */
export function annotationRows(r: Annotated, customKeys: string[] = []): string[] {
  const rows: string[] = [];
  if (r.label) rows.push(`rdfs:label "${esc(r.label)}"`);
  if (r.prefLabel) rows.push(`skos:prefLabel "${esc(r.prefLabel)}"`);
  if (r.altLabel) {
    for (const a of r.altLabel.split(',').map((x) => x.trim()).filter(Boolean)) rows.push(`skos:altLabel "${esc(a)}"`);
  }
  if (r.definition) rows.push(`skos:definition "${esc(r.definition)}"`);
  if (r.comment) rows.push(`rdfs:comment "${esc(r.comment)}"`);
  for (const k of customKeys) {
    const v = r.custom?.[k];
    if (v) rows.push(`${k} "${esc(v)}"`);
  }
  return rows;
}

export function customKeysOf(settings: Settings): string[] {
  return customAnnotationKeys(settings.customAnnotations ?? []);
}

/** `subject ; row ; row .` with the prototype's exact spacing, or `subject .` when there are no rows. */
export function statement(subject: string, rows: string[]): string {
  return rows.length ? `${subject} ;\n  ${rows.join(' ;\n  ')} .` : `${subject} .`;
}
