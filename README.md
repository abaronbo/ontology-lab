# Ontology Lab

A small, visual ontology editor that runs in the browser. Sketch and export, that is all.

**Try it:** https://abaronbo.github.io/ontology-lab/

## Overview

Ontology Lab renders classes and literals as nodes on a canvas. Connecting them
produces properties and subclass relations, and the resulting graph can be
exported as Turtle in either an OWL or a SHACL flavour.

The tool is intended for sketching and sharing ideas. It is not a replacement
for a full ontology IDE.

## Features

- Hovering a class reveals two handles: the round handle creates a property
  when dragged to another class or literal, the diamond handle creates a
  subclass relation when dragged to another class.
- Selecting an element opens a side panel for editing its annotations.
- Property cardinality is expressed in plain terms: exactly 1, at least 1, etc.
- The class tree on the left filters the canvas to the selected classes and
  their neighbours.
- Export to OWL or SHACL, either copied to the clipboard or downloaded as a
  `.ttl` file.
- Settings allow changing the base namespace, declaring prefixes, and adding
  custom annotation properties, which then
  appear as fields in the panel and in the export.
- Import an OWL or SHACL Turtle file (or a pasted snippet) back into an
  editable graph. Custom annotation predicates are detected and added to
  Settings automatically.

## Export mapping

The same drawing is serialised differently depending on the selected target.

| Drawing element | OWL | SHACL |
|---|---|---|
| Class | `owl:Class` | `rdfs:Class` that is also a `sh:NodeShape` |
| Subclass arrow | `rdfs:subClassOf` | `rdfs:subClassOf` |
| Property to a class | `owl:ObjectProperty` with domain and range | named `sh:PropertyShape` with `sh:path` and `sh:class` |
| Property to a literal | `owl:DatatypeProperty` with an `xsd:` range | named `sh:PropertyShape` with `sh:datatype` |
| Cardinality | qualified cardinality restrictions | `sh:minCount` and `sh:maxCount` |

## Getting started

Requires Node.js and npm.

```sh
git clone https://github.com/abaronbo/ontology-lab.git
cd ontology-lab
npm install
npm run dev
```

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check and produce a production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run oxlint |
| `npm run rdf-check` | Parse both exports with N3 and verify the SHACL mapping |
| `npm run roundtrip-check` | Import both exports back and verify a byte-identical re-export |

## Project structure

```
src/
  model/       Graph data model and state store (framework-agnostic)
  serialize/   OWL and SHACL Turtle serialisers
  components/  React UI: toolbar, class tree, canvas, side panel, dialogs
  styles/      Stylesheets; tokens.css defines all colours, type and spacing
scripts/       Node scripts used by rdf-check and related tooling
```

## License

[MIT](LICENSE)
