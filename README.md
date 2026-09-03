# Ontology Lab

A small, visual ontology editor that runs in your browser.

Try it: https://abaronbo.github.io/ontology-lab/

## What it does

You draw classes and literals on a canvas, connect them, and get Turtle out.

- Classes are ellipses, literals are rectangles. Drag them around.
- Hover a class to see two handles. Drag the round one to another class or a literal to create a property. Drag the diamond to another class to say it is a subclass.
- Click anything to edit its label, IRI, SKOS labels, definition and comment in the side panel.
- Set how many values a property may have in plain words: exactly 1, at least 1, at most 3, between 1 and 5.
- Tick classes in the left tree to focus the canvas on them and their neighbours.
- Export as OWL or as SHACL, copy it or download the file.

Nothing is saved between reloads yet. It is meant for sketching and sharing ideas, not for maintaining a large ontology.

## Export

The same drawing can be exported two ways.

| You draw | OWL | SHACL |
|---|---|---|
| A class | `owl:Class` | `rdfs:Class` that is also a `sh:NodeShape` |
| A subclass arrow | `rdfs:subClassOf` | `rdfs:subClassOf` |
| A property to a class | `owl:ObjectProperty` with domain and range | a named `sh:PropertyShape` with `sh:path` and `sh:class` |
| A property to a literal | `owl:DatatypeProperty` with an `xsd:` range | a named `sh:PropertyShape` with `sh:datatype` |
| Exactly, at least, at most, between | qualified cardinality restrictions | `sh:minCount` and `sh:maxCount` |

In Settings you can change the namespace, add prefixes, and add your own annotation properties such as `dcterms:created`. They show up as fields in the panel and in the export.

## Run it locally

```sh
npm install
npm run dev
```

Other scripts:

```sh
npm run build       # type check and production build
npm run lint
npm run rdf-check   # parses both exports and checks the SHACL mapping
```

## How the code is organised

- `src/model` holds the graph and the state. No React in there.
- `src/serialize` turns the graph into OWL or SHACL Turtle.
- `src/components` is the UI: toolbar, tree, canvas, side panel, dialogs.
- `src/styles/tokens.css` holds all colours, type and spacing. Nothing else hardcodes a colour.

## Known limits

- If you leave the IRI field empty, the label is used as the local name. A label with spaces or quotes then produces invalid Turtle. Fill in the IRI.
- There is no reasoning and no validation. It draws and it exports, that is all.

## Feedback

Open an issue or start a discussion. Ideas about the export mapping are especially welcome.

## License

MIT
