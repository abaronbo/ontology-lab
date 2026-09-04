import { useStore } from '../model/StoreContext';
import { Button } from './ui/Button';

export function Toolbar() {
  const { dispatch } = useStore();
  return (
    <header className="toolbar">
      <div className="toolbar__title">Ontology Lab</div>
      <div className="toolbar__actions">
        <Button variant="secondary" onClick={() => dispatch({ type: 'addClass' })}>+ Class</Button>
        <Button variant="secondary" onClick={() => dispatch({ type: 'addLiteral' })}>+ Literal</Button>
        <div className="toolbar__divider" />
        <Button variant="outlined" onClick={() => dispatch({ type: 'clear' })}>Clear</Button>
        <Button variant="outlined" onClick={() => dispatch({ type: 'setSettingsOpen', open: true })}>Settings</Button>
        <Button variant="outlined" onClick={() => dispatch({ type: 'setImportOpen', open: true })}>Import Turtle</Button>
        <Button variant="primary" onClick={() => dispatch({ type: 'setExportOpen', open: true })}>Export Turtle</Button>
      </div>
    </header>
  );
}
