import type {
  AppState,
  CardMode,
  ConnectKind,
  Counters,
  ExportFormat,
  OntoEdge,
  OntoNode,
  PanelTab,
  Selection,
  Settings,
  TreeTab,
  XsdDatatype,
} from './types';

export type NodeField = 'label' | 'iri' | 'prefLabel' | 'altLabel' | 'definition' | 'comment';
export type EdgeField = 'label' | 'iri' | 'prefLabel' | 'altLabel' | 'definition' | 'comment';

export type Action =
  | { type: 'addClass' }
  | { type: 'addLiteral' }
  | { type: 'moveNode'; id: string; x: number; y: number }
  | { type: 'select'; selection: Selection }
  | { type: 'selectEdgeFromTree'; id: string }
  | { type: 'setTreeTab'; tab: TreeTab }
  | { type: 'setPanelTab'; tab: PanelTab }
  | { type: 'toggleFocus'; id: string }
  | { type: 'hoverNode'; id: string | null }
  | { type: 'startConnecting'; fromId: string; kind: ConnectKind; x: number; y: number }
  | { type: 'moveConnecting'; x: number; y: number }
  | { type: 'finishConnecting'; targetId: string | null }
  | { type: 'updateNode'; id: string; field: NodeField; value: string }
  | { type: 'setDatatype'; id: string; datatype: XsdDatatype }
  | { type: 'updateEdge'; id: string; field: EdgeField; value: string }
  | { type: 'setCardMode'; id: string; mode: CardMode }
  | { type: 'setCardMin'; id: string; value: number }
  | { type: 'setCardMax'; id: string; value: number }
  | { type: 'deleteSelected' }
  | { type: 'clear' }
  | { type: 'setSettingsOpen'; open: boolean }
  | { type: 'setExportOpen'; open: boolean }
  | { type: 'setImportOpen'; open: boolean }
  | { type: 'importGraph'; nodes: OntoNode[]; edges: OntoEdge[]; settings: Settings; counters: Counters }
  | { type: 'setExportFormat'; format: ExportFormat }
  | { type: 'updateSettings'; patch: Partial<Settings> }
  | { type: 'setCustomAnnotation'; target: 'node' | 'edge'; id: string; key: string; value: string }
  | { type: 'setZoom'; zoom: number };

export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 2;

export const DEFAULT_SETTINGS: Settings = {
  prefix: 'ex',
  namespace: 'http://example.org/ontology#',
  extraPrefixes: [],
  customAnnotations: [],
  showPrefLabel: true,
  showAltLabel: true,
  showDefinition: true,
  showComment: true,
};

/** Same starter graph as the design prototype, so the first render is not an empty canvas. */
export const SAMPLE_NODES: OntoNode[] = [
  { id: 'n1', type: 'class', x: 260, y: 60, label: 'Person', prefLabel: '', altLabel: '', definition: 'A human being.', comment: '', iri: 'Person' },
  { id: 'n2', type: 'class', x: 520, y: 60, label: 'Organization', prefLabel: '', altLabel: '', definition: '', comment: '', iri: 'Organization' },
  { id: 'n3', type: 'class', x: 40, y: 220, label: 'Employee', prefLabel: '', altLabel: '', definition: '', comment: '', iri: 'Employee' },
  { id: 'n4', type: 'literal', x: 290, y: 240, label: 'email', datatype: 'string' },
];

export const SAMPLE_EDGES: OntoEdge[] = [
  { id: 'e1', source: 'n3', target: 'n1', kind: 'subClassOf', comment: '' },
  { id: 'e2', source: 'n1', target: 'n2', kind: 'objectProperty', label: 'worksFor', prefLabel: '', altLabel: '', definition: '', comment: '', iri: 'worksFor', cardMode: 'min', cardMin: 1, cardMax: 1 },
  { id: 'e3', source: 'n1', target: 'n4', kind: 'datatypeProperty', label: 'hasEmail', prefLabel: '', altLabel: '', definition: '', comment: '', iri: 'hasEmail', cardMode: 'exactly', cardMin: 1, cardMax: 1 },
];

export const initialState: AppState = {
  nodes: SAMPLE_NODES,
  edges: SAMPLE_EDGES,
  selection: null,
  activeTab: 'classes',
  panelTab: 'annotations',
  focusIds: [],
  hoverNodeId: null,
  connecting: null,
  settingsOpen: false,
  exportOpen: false,
  importOpen: false,
  exportFormat: 'owl',
  settings: DEFAULT_SETTINGS,
  counters: { id: 4, classes: 3, literals: 1, properties: 2 },
  zoom: 1,
};

const patchNode = (s: AppState, id: string, patch: Partial<OntoNode>): AppState => ({
  ...s,
  nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
});
const patchEdge = (s: AppState, id: string, patch: Partial<OntoEdge>): AppState => ({
  ...s,
  edges: s.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
});

function createEdge(s: AppState, sourceId: string, targetId: string, kind: ConnectKind): AppState {
  const source = s.nodes.find((n) => n.id === sourceId);
  const target = s.nodes.find((n) => n.id === targetId);
  if (!source || !target) return s;
  const id = `e${s.counters.id + 1}`;
  if (kind === 'subclass') {
    if (source.type !== 'class' || target.type !== 'class') return s;
    if (s.edges.some((e) => e.kind === 'subClassOf' && e.source === sourceId && e.target === targetId)) return s;
    const edge: OntoEdge = { id, source: sourceId, target: targetId, kind: 'subClassOf', comment: '' };
    return { ...s, edges: [...s.edges, edge], selection: { type: 'edge', id }, counters: { ...s.counters, id: s.counters.id + 1 } };
  }
  const propKind = target.type === 'literal' ? 'datatypeProperty' : 'objectProperty';
  const n = s.counters.properties + 1;
  const label = (propKind === 'datatypeProperty' ? 'hasValue' : 'relatesTo') + n;
  const edge: OntoEdge = {
    id, source: sourceId, target: targetId, kind: propKind,
    label, iri: label, prefLabel: '', altLabel: '', definition: '', comment: '',
    cardMode: 'any', cardMin: 1, cardMax: 1,
  };
  return {
    ...s,
    edges: [...s.edges, edge],
    selection: { type: 'edge', id },
    counters: { ...s.counters, id: s.counters.id + 1, properties: n },
  };
}

export function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'addClass': {
      const n = s.counters.classes + 1;
      const id = `n${s.counters.id + 1}`;
      const node: OntoNode = {
        id, type: 'class', x: 420 + (n % 4) * 40, y: 420 + (n % 3) * 40,
        label: `NewClass${n}`, iri: `NewClass${n}`, prefLabel: '', altLabel: '', definition: '', comment: '',
      };
      return { ...s, nodes: [...s.nodes, node], selection: { type: 'node', id }, focusIds: [], counters: { ...s.counters, id: s.counters.id + 1, classes: n } };
    }
    case 'addLiteral': {
      const n = s.counters.literals + 1;
      const id = `n${s.counters.id + 1}`;
      const node: OntoNode = { id, type: 'literal', x: 680 + (n % 4) * 40, y: 420 + (n % 3) * 40, label: `value${n}`, datatype: 'string' };
      return { ...s, nodes: [...s.nodes, node], selection: { type: 'node', id }, focusIds: [], counters: { ...s.counters, id: s.counters.id + 1, literals: n } };
    }
    case 'moveNode':
      return patchNode(s, a.id, { x: a.x, y: a.y });
    case 'select':
      return { ...s, selection: a.selection };
    case 'selectEdgeFromTree':
      return { ...s, selection: { type: 'edge', id: a.id }, activeTab: 'properties' };
    case 'setTreeTab':
      return { ...s, activeTab: a.tab };
    case 'setPanelTab':
      return { ...s, panelTab: a.tab };
    case 'toggleFocus':
      return { ...s, focusIds: s.focusIds.includes(a.id) ? s.focusIds.filter((f) => f !== a.id) : [...s.focusIds, a.id] };
    case 'hoverNode':
      return { ...s, hoverNodeId: a.id };
    case 'startConnecting':
      return { ...s, connecting: { fromId: a.fromId, kind: a.kind, x: a.x, y: a.y } };
    case 'moveConnecting':
      return s.connecting ? { ...s, connecting: { ...s.connecting, x: a.x, y: a.y } } : s;
    case 'finishConnecting': {
      if (!s.connecting) return s;
      const { fromId, kind } = s.connecting;
      const next = a.targetId && a.targetId !== fromId ? createEdge(s, fromId, a.targetId, kind) : s;
      return { ...next, connecting: null };
    }
    case 'updateNode':
      return patchNode(s, a.id, { [a.field]: a.value });
    case 'setDatatype':
      return patchNode(s, a.id, { datatype: a.datatype });
    case 'updateEdge':
      return patchEdge(s, a.id, { [a.field]: a.value });
    case 'setCardMode':
      return patchEdge(s, a.id, { cardMode: a.mode });
    case 'setCardMin':
      return patchEdge(s, a.id, { cardMin: Math.max(0, a.value) });
    case 'setCardMax':
      return patchEdge(s, a.id, { cardMax: Math.max(0, a.value) });
    case 'deleteSelected': {
      const sel = s.selection;
      if (!sel) return s;
      if (sel.type === 'node') {
        return {
          ...s,
          nodes: s.nodes.filter((n) => n.id !== sel.id),
          edges: s.edges.filter((e) => e.source !== sel.id && e.target !== sel.id),
          focusIds: s.focusIds.filter((f) => f !== sel.id),
          selection: null,
        };
      }
      return { ...s, edges: s.edges.filter((e) => e.id !== sel.id), selection: null };
    }
    case 'clear':
      return { ...s, nodes: [], edges: [], selection: null, focusIds: [] };
    case 'setSettingsOpen':
      return { ...s, settingsOpen: a.open };
    case 'setExportOpen':
      return { ...s, exportOpen: a.open };
    case 'setImportOpen':
      return { ...s, importOpen: a.open };
    case 'importGraph':
      return {
        ...s,
        nodes: a.nodes,
        edges: a.edges,
        settings: a.settings,
        counters: a.counters,
        selection: null,
        focusIds: [],
        hoverNodeId: null,
        connecting: null,
        importOpen: false,
      };
    case 'setExportFormat':
      return { ...s, exportFormat: a.format };
    case 'updateSettings':
      return { ...s, settings: { ...s.settings, ...a.patch } };
    case 'setCustomAnnotation': {
      if (a.target === 'node') {
        const n = s.nodes.find((x) => x.id === a.id);
        return n ? patchNode(s, a.id, { custom: { ...n.custom, [a.key]: a.value } }) : s;
      }
      const e = s.edges.find((x) => x.id === a.id);
      return e ? patchEdge(s, a.id, { custom: { ...e.custom, [a.key]: a.value } }) : s;
    }
    case 'setZoom':
      return { ...s, zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, a.zoom)) };
  }
}
