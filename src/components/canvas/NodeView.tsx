import type { MouseEvent } from 'react';
import { dims, type ConnectKind, type OntoNode } from '../../model/types';

interface Props {
  node: OntoNode;
  prefix: string;
  selected: boolean;
  hovered: boolean;
  onMouseDown: (e: MouseEvent) => void;
  onEnter: () => void;
  onLeave: () => void;
  onHandleDown: (kind: ConnectKind, e: MouseEvent) => void;
}

/** A class (ellipse) or literal (rectangle) node with its connector handles. */
export function NodeView({ node, prefix, selected, hovered, onMouseDown, onEnter, onLeave, onHandleDown }: Props) {
  const { w, h } = dims(node.type);
  const isClass = node.type === 'class';
  const caption = isClass ? `${prefix}:${node.iri || node.label}` : `xsd:${node.datatype ?? 'string'}`;
  return (
    <div
      className={`node ${selected ? 'node--selected' : ''} ${hovered ? 'node--hovered' : ''}`}
      style={{ left: node.x, top: node.y, width: w, height: h }}
      onMouseDown={onMouseDown}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className={`node__shape ${isClass ? 'node__shape--class' : 'node__shape--literal'}`}>
        <div className={`node__label ${isClass ? '' : 'node__label--literal'}`}>{node.label}</div>
        <div className="node__caption">{caption}</div>
      </div>
      {isClass && (
        <>
          <div className="handle handle--property" title="Drag to create a property" onMouseDown={(e) => onHandleDown('property', e)} />
          <div className="handle handle--subclass" title="Drag to create rdfs:subClassOf" onMouseDown={(e) => onHandleDown('subclass', e)} />
        </>
      )}
    </div>
  );
}
