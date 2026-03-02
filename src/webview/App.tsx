import { useState, useEffect } from 'react';
import type { HostToWebviewMessage, LogEntry } from '../shared/types.js';
import { useReadySignal } from './hooks/useVsCodeApi.js';
import { LogTable } from './components/LogTable.js';
import { Toolbar } from './components/Toolbar.js';

type AppState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; fileName: string; entries: LogEntry[] };

export function App() {
  useReadySignal();

  const [state, setState] = useState<AppState>({ status: 'loading' });

  useEffect(() => {
    function handleMessage(event: MessageEvent<HostToWebviewMessage>) {
      const msg = event.data;
      if (msg.type === 'loadFile') {
        setState({
          status: 'loaded',
          fileName: msg.fileName,
          entries: msg.entries,
        });
      } else if (msg.type === 'error') {
        setState({ status: 'error', message: msg.message });
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (state.status === 'loading') {
    return (
      <div className="app-loading">
        <span className="loading-spinner" />
        <span>Parsing log file…</span>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="app-error">
        <strong>Error:</strong> {state.message}
      </div>
    );
  }

  return (
    <div className="app-root">
      <Toolbar
        fileName={state.fileName}
        entryCount={state.entries.length}
      />
      <div className="app-grid-container">
        <LogTable entries={state.entries} />
      </div>
    </div>
  );
}
