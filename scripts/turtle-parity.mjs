// Compares our Turtle serializer with the prototype's reference buildTurtle on the same graph.
// Usage: npm run parity
import { existsSync, readFileSync } from 'node:fs';
import { buildTurtle } from '../src/serialize/turtle';
import { SAMPLE_NODES, SAMPLE_EDGES, DEFAULT_SETTINGS } from '../src/model/store';

const refUrl = new URL('../design_handoff_ontology_editor/Ontology Editor.dc.html', import.meta.url);
if (!existsSync(refUrl)) {
  console.log('PARITY SKIPPED — design handoff prototype not present (it is not part of the repository)');
  process.exit(0);
}
const html = readFileSync(refUrl, 'utf8');
const start = html.indexOf('  cardText(e) {');
const end = html.indexOf('  setSetting(field, value) {');
const src = html.slice(start, end);
const Proto = new Function(`return class { ${src} }`)();
const proto = new Proto();

// Ours takes structured prefix entries; the prototype takes "prefix: IRI" lines. Same data, both shapes.
const extraPrefixes = [
  { prefix: 'dcterms', iri: 'http://purl.org/dc/terms/' },
  { prefix: 'foaf', iri: 'http://xmlns.com/foaf/0.1/.' },
  { prefix: '', iri: '' }, // incomplete row: skipped by ours, absent from the reference string
];
const settings = { ...DEFAULT_SETTINGS, extraPrefixes };
const refSettings = { ...settings, extraPrefixes: extraPrefixes.filter((e) => e.prefix && e.iri).map((e) => `${e.prefix}: ${e.iri}`).join('\n') };
const nodes = [
  ...SAMPLE_NODES,
  { id: 'n9', type: 'class', x: 0, y: 0, label: 'Said "hi"', iri: '', altLabel: 'a, b ,,c', prefLabel: 'P', comment: 'c' },
  { id: 'n10', type: 'literal', x: 0, y: 0, label: 'age', datatype: 'integer' },
];
const edges = [
  ...SAMPLE_EDGES,
  { id: 'e9', source: 'n1', target: 'n10', kind: 'datatypeProperty', label: 'hasAge', iri: 'hasAge', cardMode: 'range', cardMin: 0, cardMax: 3 },
  { id: 'e10', source: 'n2', target: 'n9', kind: 'objectProperty', label: 'relatesTo5', iri: 'relatesTo5', cardMode: 'max', cardMin: 2, definition: 'd', altLabel: 'x,y' },
  { id: 'e11', source: 'n9', target: 'n2', kind: 'subClassOf' },
  { id: 'e12', source: 'n1', target: 'nMissing', kind: 'objectProperty', label: 'dangling' },
];
const ours = buildTurtle(nodes, edges, settings);
const ref = proto.buildTurtle(nodes, edges, refSettings);
if (ours === ref) {
  console.log('PARITY OK — ' + ours.split('\n').length + ' lines identical');
  console.log(ours);
} else {
  console.log('MISMATCH');
  const a = ours.split('\n'), b = ref.split('\n');
  for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) console.log(`line ${i + 1}\n  ours: ${a[i]}\n  ref:  ${b[i]}`);
  process.exit(1);
}
