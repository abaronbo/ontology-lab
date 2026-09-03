import { useMemo, useState } from 'react';
import { useStore } from '../../model/StoreContext';
import type { ExportFormat } from '../../model/types';
import { exportDocument } from '../../serialize';
import { Button } from '../ui/Button';
import { Modal } from './Modal';

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'owl', label: 'OWL' },
  { value: 'shacl', label: 'SHACL' },
];

export function ExportDialog() {
  const { state, dispatch } = useStore();
  const format = state.exportFormat;
  const doc = useMemo(
    () => exportDocument(format, state.nodes, state.edges, state.settings),
    [format, state.nodes, state.edges, state.settings],
  );
  const [copied, setCopied] = useState(false);
  const close = () => dispatch({ type: 'setExportOpen', open: false });
  const setFormat = (f: ExportFormat) => {
    dispatch({ type: 'setExportFormat', format: f });
    setCopied(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(doc.text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  const download = () => {
    const blob = new Blob([doc.text], { type: 'text/turtle' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal className="modal--export" onClose={close}>
      <div className="modal__header">
        <div className="modal__title">Turtle export</div>
        <Button variant="label" onClick={close}>Close</Button>
      </div>
      <div className="panel__tabs export__tabs" role="tablist">
        {FORMATS.map((f) => (
          <button
            key={f.value}
            role="tab"
            aria-selected={format === f.value}
            className={`panel__tab ${format === f.value ? 'panel__tab--active' : ''}`}
            onClick={() => setFormat(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <textarea className="export__text" readOnly value={doc.text} aria-label="Turtle output" />
      <div className="modal__footer">
        <Button variant="outlined" onClick={copy}>{copied ? 'Copied' : 'Copy to clipboard'}</Button>
        <Button variant="primary" onClick={download} data-filename={doc.filename}>Download .ttl</Button>
      </div>
    </Modal>
  );
}
