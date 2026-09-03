import { Canvas } from './components/canvas/Canvas';
import { ExportDialog } from './components/modals/ExportDialog';
import { SettingsDialog } from './components/modals/SettingsDialog';
import { RightPanel } from './components/panel/RightPanel';
import { Toolbar } from './components/Toolbar';
import { LeftTree } from './components/tree/LeftTree';
import { StoreProvider } from './model/StoreProvider';
import { useStore } from './model/StoreContext';

function Shell() {
  const { state } = useStore();
  return (
    <div className="app">
      <Toolbar />
      <div className="workspace">
        <LeftTree />
        <Canvas />
        <RightPanel />
      </div>
      {state.settingsOpen && <SettingsDialog />}
      {state.exportOpen && <ExportDialog />}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
