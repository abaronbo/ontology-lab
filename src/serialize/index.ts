import type { ExportFormat, OntoEdge, OntoNode, Settings } from '../model/types';
import { buildShacl } from './shacl';
import { buildTurtle } from './turtle';

export interface ExportDocument {
  text: string;
  filename: string;
}

/** The one place that maps an export format to its serializer and download name. */
export function exportDocument(format: ExportFormat, nodes: OntoNode[], edges: OntoEdge[], settings: Settings): ExportDocument {
  return format === 'shacl'
    ? { text: buildShacl(nodes, edges, settings), filename: 'shapes.ttl' }
    : { text: buildTurtle(nodes, edges, settings), filename: 'ontology.ttl' };
}
