import { dims, type OntoNode } from './types';

export interface Point {
  x: number;
  y: number;
}

export function center(node: OntoNode): Point {
  const { w, h } = dims(node.type);
  return { x: node.x + w / 2, y: node.y + h / 2 };
}

/**
 * Point on the node's shape boundary in direction (dx, dy) from its center.
 * Classes are ellipses, literals are rectangles.
 */
export function attachPoint(node: OntoNode, dx: number, dy: number): Point {
  const { w, h } = dims(node.type);
  const c = center(node);
  if (dx === 0 && dy === 0) return c;
  if (node.type === 'class') {
    const a = w / 2;
    const b = h / 2;
    const k = Math.sqrt((dx * dx) / (a * a) + (dy * dy) / (b * b));
    return { x: c.x + dx / k, y: c.y + dy / k };
  }
  const sx = dx !== 0 ? w / 2 / Math.abs(dx) : Infinity;
  const sy = dy !== 0 ? h / 2 / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy);
  return { x: c.x + dx * s, y: c.y + dy * s };
}

export interface EdgeGeometry {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  mx: number;
  my: number;
}

export function edgeGeometry(source: OntoNode, target: OntoNode): EdgeGeometry {
  const sc = center(source);
  const tc = center(target);
  const dx = tc.x - sc.x;
  const dy = tc.y - sc.y;
  const p1 = attachPoint(source, dx, dy);
  const p2 = attachPoint(target, -dx, -dy);
  return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, mx: (p1.x + p2.x) / 2, my: (p1.y + p2.y) / 2 };
}

/** Where a drag-to-connect preview line starts: right-edge middle for property, top-center for subclass. */
export function handleOrigin(node: OntoNode, kind: 'property' | 'subclass'): Point {
  const { w, h } = dims(node.type);
  return kind === 'subclass' ? { x: node.x + w / 2, y: node.y } : { x: node.x + w, y: node.y + h / 2 };
}

export function nodeContains(node: OntoNode, p: Point): boolean {
  const { w, h } = dims(node.type);
  return p.x >= node.x && p.x <= node.x + w && p.y >= node.y && p.y <= node.y + h;
}
