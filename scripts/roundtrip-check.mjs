// Round-trips OWL and SHACL exports through the Turtle importer and asserts byte-identical
// re-export, plus the negative cases from PLAN-import.md item 6.
// Usage: npm run roundtrip-check
import { Parser } from 'n3';
import { DEFAULT_SETTINGS, SAMPLE_EDGES, SAMPLE_NODES } from '../src/model/store';
import { exportDocument } from '../src/serialize';
import { ImportError, importTurtle } from '../src/serialize/import';

let failures = 0;
const check = (cond, msg) => {
  if (!cond) { failures++; console.log('  FAIL ' + msg); } else console.log('  ok   ' + msg);
};

/** Lines of the block that starts with `subject a` up to its terminating ` .` */
const block = (text, subject) => {
  const i = text.indexOf(`${subject} a `);
  if (i < 0) return null;
  const j = text.indexOf(' .\n', i);
  return text.slice(i, j < 0 ? undefined : j + 2);
};

function localOf(n) {
  return n.iri || n.label || '';
}

/** Exports `nodes`/`edges` with `settings`, imports the result back, and asserts a byte-identical
 *  re-export with the given settings, no unexpected warnings, and a matching first class block. */
function assertRoundTrip(name, nodes, edges, settings, expectWarnings = 0) {
  const results = {};
  for (const format of ['owl', 'shacl']) {
    const { text } = exportDocument(format, nodes, edges, settings);
    let R;
    try {
      R = importTurtle(text, settings);
    } catch (e) {
      check(false, `${name} ${format}: importTurtle threw unexpectedly: ${e}`);
      continue;
    }
    check(R.warnings.length === expectWarnings, `${name} ${format}: warnings.length === ${expectWarnings} (got [${R.warnings.join(' | ')}])`);
    const reexported = exportDocument(format, R.nodes, R.edges, R.settings).text;
    check(reexported === text, `${name} ${format}: re-export is byte-identical`);
    const firstClass = nodes.find((n) => n.type === 'class');
    if (firstClass) {
      const subject = `${settings.prefix}:${localOf(firstClass)}`;
      check(block(text, subject) === block(reexported, subject), `${name} ${format}: first class block matches`);
    }
    results[format] = { text, R, reexported };
  }
  return results;
}

// ---- Fixture A: sample graph ---------------------------------------------------------------
console.log('Fixture A (sample graph, DEFAULT_SETTINGS)');
assertRoundTrip('A', SAMPLE_NODES, SAMPLE_EDGES, DEFAULT_SETTINGS);

// ---- Fixture B': rdf-check's fixture B minus dangling edges and the duplicate-name edge ----
console.log("Fixture B' (edge cases, minus dangling edges and duplicate-name edge)");
const bSettings = {
  ...DEFAULT_SETTINGS,
  extraPrefixes: [{ prefix: 'dcterms', iri: 'http://purl.org/dc/terms/' }],
  customAnnotations: ['dcterms:created'],
};
const bNodes = [
  { id: 'a', type: 'class', x: 0, y: 0, label: 'A', iri: 'A', custom: { 'dcterms:created': '2026-09-03' } },
  { id: 'b', type: 'class', x: 0, y: 0, label: 'B', iri: 'B' },
  { id: 'c', type: 'class', x: 0, y: 0, label: 'C', iri: 'C' },
  { id: 'd', type: 'class', x: 0, y: 0, label: '', iri: 'D' },
  { id: 'l', type: 'literal', x: 0, y: 0, label: 'count', datatype: 'integer' },
];
const bEdges = [
  { id: 's1', source: 'a', target: 'b', kind: 'subClassOf' },
  { id: 'e1', source: 'a', target: 'b', kind: 'objectProperty', label: 'pAny', iri: 'pAny', cardMode: 'any', cardMin: 7, cardMax: 9 },
  { id: 'e2', source: 'a', target: 'b', kind: 'objectProperty', label: 'pExactly', iri: 'pExactly', cardMode: 'exactly', cardMin: 2, cardMax: 9 },
  { id: 'e3', source: 'a', target: 'l', kind: 'datatypeProperty', label: 'pMin', iri: 'pMin', cardMode: 'min', cardMin: 3, cardMax: 9, definition: 'How many', comment: 'ignored when definition set' },
  { id: 'e4', source: 'a', target: 'b', kind: 'objectProperty', label: 'pMax', iri: 'pMax', cardMode: 'max', cardMin: 4, cardMax: 9, comment: 'Only a comment' },
  { id: 'e5', source: 'a', target: 'l', kind: 'datatypeProperty', label: 'pRange', iri: 'pRange', cardMode: 'range', cardMin: 1, cardMax: 5 },
];
const bResults = assertRoundTrip("B'", bNodes, bEdges, bSettings);
if (bResults.owl) {
  const { R } = bResults.owl;
  check(R.settings.customAnnotations.includes('dcterms:created'), "B' owl: customAnnotations includes dcterms:created");
  check(R.settings.extraPrefixes.some((p) => p.prefix === 'dcterms'), "B' owl: extraPrefixes includes dcterms");
  const nodeA = R.nodes.find((n) => n.iri === 'A');
  check(nodeA?.custom?.['dcterms:created'] === '2026-09-03', "B' owl: node A custom['dcterms:created'] === '2026-09-03'");
  check(bResults.owl.text.includes('ex:D a owl:Class .') && !bResults.owl.text.includes('ex:D a owl:Class ;\n  rdfs:label "D"'), "B' owl: ex:D a owl:Class . present with no rdfs:label \"D\"");
}
// Importing B' with DEFAULT_SETTINGS (not the exporting settings) still round-trips byte-equal
// and discovers the custom key.
for (const format of ['owl', 'shacl']) {
  const { text } = exportDocument(format, bNodes, bEdges, bSettings);
  const R2 = importTurtle(text, DEFAULT_SETTINGS);
  check(R2.warnings.length === 0, `B' ${format} (imported with DEFAULT_SETTINGS): no warnings`);
  const reexported2 = exportDocument(format, R2.nodes, R2.edges, R2.settings).text;
  check(reexported2 === text, `B' ${format} (imported with DEFAULT_SETTINGS): re-export is byte-identical`);
  check(R2.settings.customAnnotations.includes('dcterms:created'), `B' ${format} (imported with DEFAULT_SETTINGS): discovers dcterms:created`);
}

// ---- Fixture C: interleaved properties, prefLabel/altLabel, relabelled property, backslash --
console.log('Fixture C (interleaved properties, prefLabel/altLabel, backslash label)');
const cSettings = {
  ...DEFAULT_SETTINGS,
  extraPrefixes: [{ prefix: 'dcterms', iri: 'http://purl.org/dc/terms/' }],
  customAnnotations: ['dcterms:modified', 'dcterms:created'],
};
const cNodes = [
  { id: 'x', type: 'class', x: 0, y: 0, label: 'X', iri: 'X', prefLabel: 'Ex', altLabel: 'b, a', custom: { 'dcterms:modified': '2026-01-01' } },
  { id: 'y', type: 'class', x: 0, y: 0, label: 'a\\tb', iri: 'Y', custom: { 'dcterms:created': '2026-02-02' } },
  { id: 'n', type: 'class', x: 0, y: 0, label: '', iri: 'NoAnnoClass' },
  { id: 'lit', type: 'literal', x: 0, y: 0, label: 'val', datatype: 'integer' },
];
const cEdges = [
  { id: 'p1', source: 'x', target: 'y', kind: 'objectProperty', label: 'works for', iri: 'worksFor', prefLabel: 'Ex', altLabel: 'b, a', cardMode: 'min', cardMin: 1, cardMax: 1 },
  { id: 'q1', source: 'y', target: 'x', kind: 'objectProperty', label: 'q1', iri: 'q1', cardMode: 'any', cardMin: 1, cardMax: 1 },
  { id: 'p2', source: 'x', target: 'y', kind: 'objectProperty', label: 'p2', iri: 'p2', cardMode: 'any', cardMin: 1, cardMax: 1 },
  { id: 'q2', source: 'y', target: 'lit', kind: 'datatypeProperty', label: 'q2', iri: 'q2', cardMode: 'exactly', cardMin: 1, cardMax: 1 },
];
const cResults = assertRoundTrip('C', cNodes, cEdges, cSettings);
if (cResults.owl) {
  const { R } = cResults.owl;
  const nodeY = R.nodes.find((n) => n.iri === 'Y');
  check(nodeY?.label === 'a\\tb', 'C owl: class Y label with literal backslash round-trips to the identical model string');
  const nodeX = R.nodes.find((n) => n.iri === 'X');
  check(nodeX?.prefLabel === 'Ex' && nodeX?.altLabel === 'b, a', 'C owl: class X prefLabel/altLabel round-trip');
  const edgeP1 = R.edges.find((e) => e.iri === 'worksFor');
  check(edgeP1?.label === 'works for' && edgeP1?.prefLabel === 'Ex' && edgeP1?.altLabel === 'b, a', 'C owl: property worksFor label/prefLabel/altLabel round-trip');
}

// ---- Negative cases -------------------------------------------------------------------------
console.log('Negative cases');

// (i) literal predicate as a full IRI with no declared prefix: 1 warning, no throw.
const negI = [
  '@prefix ex: <http://example.org/ontology#> .',
  '@prefix owl: <http://www.w3.org/2002/07/owl#> .',
  'ex:A a owl:Class ;',
  '  <http://unknown.example/p> "hello" .',
  '',
].join('\n');
{
  const R = importTurtle(negI, DEFAULT_SETTINGS);
  check(R.warnings.length === 1, `(i) exactly 1 warning (got ${R.warnings.length})`);
  check(R.nodes.length === 1 && R.nodes[0].iri === 'A', '(i) class A still imported');
}

// (ii) a class in a foreign namespace: warning and skipped.
const negII = [
  '@prefix ex: <http://example.org/ontology#> .',
  '@prefix other: <http://other.example/> .',
  '@prefix owl: <http://www.w3.org/2002/07/owl#> .',
  'ex:A a owl:Class .',
  'other:Foreign a owl:Class .',
  '',
].join('\n');
{
  const R = importTurtle(negII, DEFAULT_SETTINGS);
  check(R.nodes.length === 1 && R.nodes[0].iri === 'A', '(ii) foreign class skipped, only A imported');
  check(R.warnings.length === 1, `(ii) exactly 1 warning (got ${R.warnings.length})`);
}

// (iii) a label with a newline and a backslash: warning; re-export parses and contains \\.
const negIII = [
  '@prefix ex: <http://example.org/ontology#> .',
  '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .',
  '@prefix owl: <http://www.w3.org/2002/07/owl#> .',
  'ex:A a owl:Class ;',
  '  rdfs:label "line1\\nline2\\\\end" .',
  '',
].join('\n');
{
  const R = importTurtle(negIII, DEFAULT_SETTINGS);
  check(R.warnings.length >= 1, '(iii) at least 1 warning for the control character');
  const nodeA = R.nodes.find((n) => n.iri === 'A');
  check(nodeA?.label === 'line1 line2\\end', `(iii) label normalized, backslash kept (got ${JSON.stringify(nodeA?.label)})`);
  const reexported = exportDocument('owl', R.nodes, R.edges, R.settings).text;
  check(reexported.includes('\\\\'), '(iii) re-export contains an escaped backslash');
  try {
    new Parser({ format: 'text/turtle' }).parse(reexported);
    check(true, '(iii) re-export parses');
  } catch (e) {
    check(false, `(iii) re-export parses: ${e.message}`);
  }
}

// (iv-a) SHACL: two shapes on the same path yield two edges.
const negIVa = [
  '@prefix ex: <http://example.org/ontology#> .',
  '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .',
  '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .',
  '@prefix sh: <http://www.w3.org/ns/shacl#> .',
  'ex:X a rdfs:Class, sh:NodeShape ;',
  '  sh:property ex:X-p1Shape, ex:X-p1Shape-2 .',
  'ex:X-p1Shape a sh:PropertyShape ;',
  '  sh:path ex:p1 ;',
  '  sh:class ex:X .',
  'ex:X-p1Shape-2 a sh:PropertyShape ;',
  '  sh:path ex:p1 ;',
  '  sh:class ex:X .',
  'ex:p1 a rdf:Property ;',
  '  rdfs:label "p1" .',
  '',
].join('\n');
{
  const R = importTurtle(negIVa, DEFAULT_SETTINGS);
  check(R.edges.filter((e) => e.kind !== 'subClassOf').length === 2, '(iv-a) two shapes on the same path yield two edges');
}

// (iv-b) OWL: a property with two rdfs:domain values yields one edge and one warning naming it.
const negIVb = [
  '@prefix ex: <http://example.org/ontology#> .',
  '@prefix owl: <http://www.w3.org/2002/07/owl#> .',
  '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .',
  'ex:A a owl:Class .',
  'ex:B a owl:Class .',
  'ex:C a owl:Class .',
  'ex:p a owl:ObjectProperty ;',
  '  rdfs:domain ex:A ;',
  '  rdfs:domain ex:C ;',
  '  rdfs:range ex:B .',
  '',
].join('\n');
{
  const R = importTurtle(negIVb, DEFAULT_SETTINGS);
  check(R.edges.filter((e) => e.kind !== 'subClassOf').length === 1, '(iv-b) two domains on one property yield one edge');
  check(R.warnings.some((w) => w.includes('"p"')), '(iv-b) warning names the property "p"');
}

// (v) malformed Turtle throws ImportError.
{
  const negV = '@prefix ex: <http://example.org/ontology#> .\nex:A a owl:Class ;\n  rdfs:label "unterminated .\n';
  try {
    importTurtle(negV, DEFAULT_SETTINGS);
    check(false, '(v) malformed Turtle should throw');
  } catch (e) {
    check(e instanceof ImportError, `(v) throws ImportError (got ${e?.constructor?.name})`);
  }
}

// (vi) text over 5 MB throws ImportError without parsing.
{
  const negVI = 'x'.repeat(5 * 1024 * 1024 + 1);
  try {
    importTurtle(negVI, DEFAULT_SETTINGS);
    check(false, '(vi) oversized text should throw');
  } catch (e) {
    check(e instanceof ImportError, `(vi) throws ImportError (got ${e?.constructor?.name})`);
  }
}

console.log(failures ? `\n${failures} check(s) FAILED` : '\nROUNDTRIP CHECK OK');
if (failures) process.exit(1);
