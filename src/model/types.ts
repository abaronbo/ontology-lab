// Graph model for the ontology sketch. Mirrors the README "State management" section.

export type NodeType = 'class' | 'literal';
export type EdgeKind = 'subClassOf' | 'objectProperty' | 'datatypeProperty';
export type CardMode = 'any' | 'exactly' | 'min' | 'max' | 'range';
export type XsdDatatype = 'string' | 'integer' | 'decimal' | 'boolean' | 'date' | 'dateTime' | 'anyURI';

export const XSD_DATATYPES: XsdDatatype[] = ['string', 'integer', 'decimal', 'boolean', 'date', 'dateTime', 'anyURI'];

export interface OntoNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  label: string;
  // classes
  iri?: string;
  prefLabel?: string;
  altLabel?: string;
  definition?: string;
  comment?: string;
  // literals
  datatype?: XsdDatatype;
  /** Values for the custom annotation properties configured in Settings, keyed by CURIE. */
  custom?: Record<string, string>;
}

export interface OntoEdge {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
  label?: string;
  iri?: string;
  prefLabel?: string;
  altLabel?: string;
  definition?: string;
  comment?: string; // subClassOf uses comment only
  cardMode?: CardMode; // property edges
  cardMin?: number;
  cardMax?: number;
  custom?: Record<string, string>;
}

export interface PrefixEntry {
  prefix: string;
  iri: string;
}

export interface Settings {
  prefix: string; // 'ex'
  namespace: string; // 'http://example.org/ontology#'
  extraPrefixes: PrefixEntry[]; // declared in the export; needed by custom annotation CURIEs
  customAnnotations: string[]; // CURIEs, e.g. 'dcterms:created', each becomes an annotation field
  showPrefLabel: boolean;
  showAltLabel: boolean;
  showDefinition: boolean;
  showComment: boolean;
}

export type Selection = { type: 'node' | 'edge'; id: string } | null;
export type TreeTab = 'classes' | 'properties';
export type PanelTab = 'annotations' | 'relations';
export type ConnectKind = 'property' | 'subclass';
export type ExportFormat = 'owl' | 'shacl';

export interface Connecting {
  fromId: string;
  kind: ConnectKind;
  x: number;
  y: number;
}

/** Counters that drive default names and ids (NewClass3, relatesTo4, ...). */
export interface Counters {
  id: number;
  classes: number;
  literals: number;
  properties: number;
}

export interface AppState {
  nodes: OntoNode[];
  edges: OntoEdge[];
  selection: Selection;
  activeTab: TreeTab;
  panelTab: PanelTab;
  focusIds: string[];
  hoverNodeId: string | null;
  connecting: Connecting | null;
  settingsOpen: boolean;
  exportOpen: boolean;
  importOpen: boolean;
  exportFormat: ExportFormat;
  settings: Settings;
  counters: Counters;
  zoom: number; // canvas scale factor, 1 = 100%
}

export interface Dims {
  w: number;
  h: number;
}

export const NODE_DIMS: Record<NodeType, Dims> = {
  class: { w: 176, h: 92 },
  literal: { w: 130, h: 50 },
};

export const CANVAS_SIZE = { w: 2200, h: 1400 };

export function dims(type: NodeType): Dims {
  return NODE_DIMS[type];
}

export function isPropertyEdge(e: OntoEdge): boolean {
  return e.kind !== 'subClassOf';
}
