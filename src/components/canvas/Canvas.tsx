import { useCallback, useEffect, useRef } from 'react';
import { applyFocus, indexNodes } from '../../model/derive';
import { nodeContains } from '../../model/geometry';
import { MIN_ZOOM } from '../../model/store';
import { useStore } from '../../model/StoreContext';
import { CANVAS_SIZE, dims, type ConnectKind } from '../../model/types';
import { Button } from '../ui/Button';
import { EdgeLayer } from './EdgeLayer';
import { Legend } from './Legend';
import { NodeView } from './NodeView';
import { PropertyChip } from './PropertyChip';

interface DragState {
  id: string;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
}

export function Canvas() {
  const { state, dispatch } = useStore();
  const canvasRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const zoom = state.zoom;
  // Transient drag bookkeeping lives outside render state.
  const dragRef = useRef<DragState | null>(null);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    // Layer coordinates: the layer is CSS-scaled, so divide the on-screen offset by the current zoom.
    const toCanvas = (e: MouseEvent) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const z = stateRef.current.zoom;
      return { x: (e.clientX - rect.left) / z, y: (e.clientY - rect.top) / z };
    };
    const onMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (drag) {
        const z = stateRef.current.zoom;
        dispatch({ type: 'moveNode', id: drag.id, x: drag.origX + (e.clientX - drag.startX) / z, y: drag.origY + (e.clientY - drag.startY) / z });
      } else if (stateRef.current.connecting && canvasRef.current) {
        const p = toCanvas(e);
        dispatch({ type: 'moveConnecting', x: p.x, y: p.y });
      }
    };
    const onUp = (e: MouseEvent) => {
      dragRef.current = null;
      const { connecting, nodes } = stateRef.current;
      if (connecting && canvasRef.current) {
        const p = toCanvas(e);
        const target = nodes.find((n) => n.id !== connecting.fromId && nodeContains(n, p));
        dispatch({ type: 'finishConnecting', targetId: target?.id ?? null });
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dispatch]);

  const startDrag = (id: string, e: React.MouseEvent) => {
    const node = state.nodes.find((n) => n.id === id);
    if (!node || e.button !== 0) return;
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, origX: node.x, origY: node.y };
    dispatch({ type: 'select', selection: { type: 'node', id } });
  };

  const startConnect = (id: string, kind: ConnectKind, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    dispatch({ type: 'startConnecting', fromId: id, kind, x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom });
  };

  const shown = applyFocus(state.nodes, state.edges, state.focusIds);

  /** Scale and scroll so every visible node fits in the viewport with some breathing room. */
  const zoomToFit = useCallback(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    if (!shown.nodes.length) {
      dispatch({ type: 'setZoom', zoom: 1 });
      viewport.scrollTo({ left: 0, top: 0 });
      return;
    }
    const PAD = 48;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of shown.nodes) {
      const d = dims(n.type);
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + d.w);
      maxY = Math.max(maxY, n.y + d.h);
    }
    const bw = maxX - minX + PAD * 2;
    const bh = maxY - minY + PAD * 2;
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    // Fit never magnifies past 100%: a small graph should not balloon.
    const z = Math.min(1, Math.max(MIN_ZOOM, Math.min(vw / bw, vh / bh)));
    dispatch({ type: 'setZoom', zoom: z });
    // Scroll after the scaled stage has been laid out.
    requestAnimationFrame(() => {
      viewport.scrollTo({
        left: (minX - PAD) * z - (vw - bw * z) / 2,
        top: (minY - PAD) * z - (vh - bh * z) / 2,
      });
    });
  }, [shown.nodes, dispatch]);

  const resetZoom = () => {
    dispatch({ type: 'setZoom', zoom: 1 });
    scrollRef.current?.scrollTo({ left: 0, top: 0 });
  };
  const byId = indexNodes(state.nodes);
  const sel = state.selection;

  return (
    <div className="canvas-area">
      <div className="canvas-scroll" ref={scrollRef}>
      <div className="canvas-stage" style={{ width: CANVAS_SIZE.w * zoom, height: CANVAS_SIZE.h * zoom }}>
      <div className="canvas" ref={canvasRef} style={{ transform: `scale(${zoom})` }}>
        <EdgeLayer edges={shown.edges} byId={byId} selection={sel} connecting={state.connecting} />
        {shown.edges.map((e) =>
          e.kind === 'subClassOf' ? null : (
            <PropertyChip
              key={e.id}
              edge={e}
              source={byId[e.source]}
              target={byId[e.target]}
              onSelect={() => dispatch({ type: 'select', selection: { type: 'edge', id: e.id } })}
            />
          ),
        )}
        {shown.nodes.map((n) => (
          <NodeView
            key={n.id}
            node={n}
            prefix={state.settings.prefix || 'ex'}
            selected={sel?.type === 'node' && sel.id === n.id}
            hovered={state.hoverNodeId === n.id || state.connecting?.fromId === n.id}
            onMouseDown={(e) => startDrag(n.id, e)}
            onEnter={() => dispatch({ type: 'hoverNode', id: n.id })}
            onLeave={() => dispatch({ type: 'hoverNode', id: null })}
            onHandleDown={(kind, e) => startConnect(n.id, kind, e)}
          />
        ))}
      </div>
      </div>
      </div>
      <div className="zoom-controls">
        <Button variant="outlined" onClick={zoomToFit}>Zoom to fit</Button>
        <Button variant="outlined" onClick={resetZoom} disabled={zoom === 1} title="Reset to 100%">
          {Math.round(zoom * 100)}%
        </Button>
      </div>
      <Legend />
    </div>
  );
}
