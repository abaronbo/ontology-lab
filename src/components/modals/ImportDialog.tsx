import { useState } from 'react';
import { useStore } from '../../model/StoreContext';
import { ImportError, importTurtle } from '../../serialize/import';
import { Button } from '../ui/Button';
import { Modal } from './Modal';

export function ImportDialog() {
  const { state, dispatch } = useStore();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[] | null>(null);

  const close = () => dispatch({ type: 'setImportOpen', open: false });

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setText(typeof reader.result === 'string' ? reader.result : '');
    reader.readAsText(file);
  };

  const doImport = () => {
    setError(null);
    try {
      const result = importTurtle(text, state.settings);
      dispatch({ type: 'importGraph', nodes: result.nodes, edges: result.edges, settings: result.settings, counters: result.counters });
      if (result.warnings.length) {
        setWarnings(result.warnings);
        dispatch({ type: 'setImportOpen', open: true });
      }
    } catch (e) {
      setError(e instanceof ImportError ? e.message : 'Could not import this file.');
    }
  };

  if (warnings) {
    return (
      <Modal className="modal--import" onClose={close}>
        <div className="modal__header">
          <div className="modal__title">Turtle import</div>
          <Button variant="label" onClick={close}>Close</Button>
        </div>
        <div className="modal__body">
          <div className="section-heading">Imported with warnings</div>
          <ul className="import__warnings">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
        <div className="modal__footer">
          <Button variant="primary" onClick={close}>Close</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal className="modal--import" onClose={close}>
      <div className="modal__header">
        <div className="modal__title">Turtle import</div>
        <Button variant="label" onClick={close}>Close</Button>
      </div>
      <div className="modal__body">
        <input
          type="file"
          accept=".ttl,text/turtle"
          aria-label="Choose a Turtle file"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <textarea
          className="textarea textarea--mono import__text"
          aria-label="Turtle to import"
          placeholder="Paste Turtle here, or choose a file above."
          value={text}
          onChange={(e) => { setText(e.target.value); setError(null); }}
        />
        <div className="import__note">Importing replaces the current drawing.</div>
        {error && <div className="import__error">{error}</div>}
      </div>
      <div className="modal__footer">
        <Button variant="label" onClick={close}>Cancel</Button>
        <Button variant="primary" onClick={doImport} disabled={!text.trim()}>Import</Button>
      </div>
    </Modal>
  );
}
