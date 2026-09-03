// Parses the OWL and SHACL exports with the n3 Turtle parser and asserts the SHACL mapping.
// Usage: npm run rdf-check
import { Parser } from 'n3';
import { DEFAULT_SETTINGS, SAMPLE_EDGES, SAMPLE_NODES } from '../src/model/store';
import { exportDocument } from '../src/serialize';
import { buildTurtle } from '../src/serialize/turtle';

let failures = 0;
const check = (cond, msg) => { if (!cond) { failures++; console.log('  FAIL ' + msg); } else console.log('  ok   ' + msg); };
const parse = (label, text) => {
  try {
    const quads = new Parser({ format: 'text/turtle' }).parse(text);
    console.log(`  ok   ${label} parses (${quads.length} triples)`);
    return quads;
  } catch (e) {
    failures++;
    console.log(`  FAIL ${label} does not parse: ${e.message}`);
    return [];
  }
};
/** Lines of the block that starts with `subject a` up to its terminating ` .` */
const block = (text, subject) => {
  const i = text.indexOf(`${subject} a `);
  if (i < 0) return null;
  const j = text.indexOf(' .\n', i);
  return text.slice(i, j < 0 ? undefined : j + 2);
};

// ---- Fixture A: sample graph ------------------------------------------------------------
console.log('Fixture A (sample graph)');
const A = { nodes: SAMPLE_NODES, edges: SAMPLE_EDGES, settings: DEFAULT_SETTINGS };
const aOwl = exportDocument('owl', A.nodes, A.edges, A.settings);
const aSh = exportDocument('shacl', A.nodes, A.edges, A.settings);
parse('OWL', aOwl.text);
parse('SHACL', aSh.text);
check(aOwl.filename === 'ontology.ttl' && aSh.filename === 'shapes.ttl', 'filenames ontology.ttl / shapes.ttl');
check(aOwl.text === buildTurtle(A.nodes, A.edges, A.settings), 'owl branch equals buildTurtle');
check(aSh.text.includes('sh:NodeShape') && !aSh.text.includes('owl:'), 'shacl text has sh:NodeShape and no owl:');
check(aSh.text.includes('@prefix sh: <http://www.w3.org/ns/shacl#> .'), 'sh prefix declared');
const person = block(aSh.text, 'ex:Person');
check(person?.startsWith('ex:Person a rdfs:Class, sh:NodeShape'), 'Person is rdfs:Class, sh:NodeShape');
check(person?.includes('sh:property ex:Person-worksForShape, ex:Person-hasEmailShape'), 'Person references both named shapes');
check(block(aSh.text, 'ex:Employee')?.includes('rdfs:subClassOf ex:Person'), 'Employee subClassOf Person');
const worksFor = block(aSh.text, 'ex:Person-worksForShape');
check(worksFor?.includes('sh:path ex:worksFor') && worksFor.includes('sh:class ex:Organization') && worksFor.includes('sh:minCount 1') && !worksFor.includes('sh:maxCount'), 'worksFor shape: path, sh:class, minCount 1, no maxCount');
const hasEmail = block(aSh.text, 'ex:Person-hasEmailShape');
check(hasEmail?.includes('sh:path ex:hasEmail') && hasEmail.includes('sh:datatype xsd:string') && hasEmail.includes('sh:minCount 1 ;\n  sh:maxCount 1'), 'hasEmail shape: path, sh:datatype xsd:string, min 1 max 1');
check(block(aSh.text, 'ex:worksFor')?.startsWith('ex:worksFor a rdf:Property') && block(aSh.text, 'ex:worksFor').includes('rdfs:label "worksFor"'), 'worksFor declared as rdf:Property with label');

// ---- Fixture B: edge cases ---------------------------------------------------------------
console.log('Fixture B (edge cases)');
const B = {
  settings: {
    ...DEFAULT_SETTINGS,
    extraPrefixes: [{ prefix: 'dcterms', iri: 'http://purl.org/dc/terms/' }],
    customAnnotations: ['dcterms:created'],
  },
  nodes: [
    { id: 'a', type: 'class', x: 0, y: 0, label: 'A', iri: 'A', custom: { 'dcterms:created': '2026-09-03' } },
    { id: 'b', type: 'class', x: 0, y: 0, label: 'B', iri: 'B' },
    { id: 'c', type: 'class', x: 0, y: 0, label: 'C', iri: 'C' },
    { id: 'd', type: 'class', x: 0, y: 0, label: '', iri: 'D' }, // no annotations at all
    { id: 'l', type: 'literal', x: 0, y: 0, label: 'count', datatype: 'integer' },
  ],
  edges: [
    { id: 's1', source: 'a', target: 'b', kind: 'subClassOf' },
    { id: 'e1', source: 'a', target: 'b', kind: 'objectProperty', label: 'pAny', iri: 'pAny', cardMode: 'any', cardMin: 7, cardMax: 9 },
    { id: 'e2', source: 'a', target: 'b', kind: 'objectProperty', label: 'pExactly', iri: 'pExactly', cardMode: 'exactly', cardMin: 2, cardMax: 9 },
    { id: 'e3', source: 'a', target: 'l', kind: 'datatypeProperty', label: 'pMin', iri: 'pMin', cardMode: 'min', cardMin: 3, cardMax: 9, definition: 'How many', comment: 'ignored when definition set' },
    { id: 'e4', source: 'a', target: 'b', kind: 'objectProperty', label: 'pMax', iri: 'pMax', cardMode: 'max', cardMin: 4, cardMax: 9, comment: 'Only a comment' },
    { id: 'e5', source: 'a', target: 'l', kind: 'datatypeProperty', label: 'pRange', iri: 'pRange', cardMode: 'range', cardMin: 1, cardMax: 5 },
    { id: 'e6', source: 'a', target: 'b', kind: 'objectProperty', label: 'pExactly', iri: 'pExactly', cardMode: 'any' }, // same name → suffixed shape
    { id: 'd1', source: 'a', target: 'missing', kind: 'objectProperty', label: 'dangling', iri: 'dangling', cardMode: 'exactly', cardMin: 1 },
    { id: 'd2', source: 'c', target: 'missing', kind: 'subClassOf' },
  ],
};
const bOwl = exportDocument('owl', B.nodes, B.edges, B.settings);
const bSh = exportDocument('shacl', B.nodes, B.edges, B.settings);
parse('OWL', bOwl.text);
const quads = parse('SHACL', bSh.text);
const t = bSh.text;
const shape = (n) => block(t, `ex:A-${n}Shape`);
check(shape('pExactly')?.includes('sh:minCount 2') && shape('pExactly').includes('sh:maxCount 2') && !shape('pExactly').includes('9'), 'exactly → min 2, max 2, cardMax ignored');
check(shape('pMin')?.includes('sh:minCount 3') && !shape('pMin').includes('sh:maxCount'), 'min → minCount 3 only');
check(shape('pMax')?.includes('sh:maxCount 4') && !shape('pMax').includes('sh:minCount'), 'max → maxCount 4 only (reads cardMin)');
check(shape('pRange')?.includes('sh:minCount 1 ;\n  sh:maxCount 5'), 'range → min 1, max 5');
check(shape('pAny') && !shape('pAny').includes('Count'), 'any → no counts');
check(shape('pMin')?.includes('sh:datatype xsd:integer') && shape('pRange')?.includes('sh:datatype xsd:integer'), 'datatype properties → sh:datatype xsd:integer');
check(shape('pAny')?.includes('sh:class ex:B') && shape('pExactly')?.includes('sh:class ex:B') && shape('pMax')?.includes('sh:class ex:B'), 'object properties → sh:class ex:B');
check(shape('pMin')?.includes('sh:description "How many"') && !shape('pMin').includes('ignored'), 'sh:description prefers definition');
check(shape('pMax')?.includes('sh:description "Only a comment"'), 'sh:description falls back to comment');
check(block(t, 'ex:A-pExactlyShape-2') !== null && block(t, 'ex:A')?.includes('ex:A-pExactlyShape-2'), 'duplicate property name gets a suffixed shape');
const body = t.split('\n').filter((l) => !l.startsWith('@prefix')).join('\n');
check(!t.includes('dangling') && !body.includes('ex: ') && !/rdfs:subClassOf ex:\s*[;.]/.test(body), 'dangling edges skipped, no empty local names');
check(block(t, 'ex:A')?.includes('dcterms:created "2026-09-03"') && t.includes('@prefix dcterms:'), 'custom annotation and its prefix present');
check(block(t, 'ex:C') === 'ex:C a rdfs:Class, sh:NodeShape ;\n  rdfs:label "C" .', 'C keeps only its label: dangling parent dropped');
check(t.includes('ex:D a rdfs:Class, sh:NodeShape .'), 'bare class D emitted as a single statement');
const shaclNs = 'http://www.w3.org/ns/shacl#';
check(quads.some((q) => q.predicate.value === shaclNs + 'property' && q.object.value.endsWith('A-pRangeShape')), 'parsed: A sh:property → named shape (IRI, not blank node)');
check(quads.filter((q) => q.predicate.value === shaclNs + 'maxCount').every((q) => q.object.datatype.value === 'http://www.w3.org/2001/XMLSchema#integer'), 'parsed: counts are xsd:integer literals');

console.log(failures ? `\n${failures} check(s) FAILED` : '\nRDF CHECK OK');
if (failures) process.exit(1);
