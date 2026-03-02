import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { HostToWebviewMessage, LogEntry } from '../shared/types.js';
import { useReadySignal, useVsCodeApi } from './hooks/useVsCodeApi.js';
import { LogTable } from './components/LogTable.js';
import { Toolbar } from './components/Toolbar.js';
import { TabBar, type FileTab } from './components/TabBar.js';

interface FileData {
  fileName: string;
  entries: LogEntry[];
}

export function App() {
  useReadySignal();
  const vscodeApi = useVsCodeApi();

  // Map from filePath → file data
  const [files, setFiles] = useState<Map<string, FileData>>(new Map());
  const [activeTab, setActiveTab] = useState<string>('');   // filePath or 'merged'
  const [search, setSearch] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Message handling
  // -------------------------------------------------------------------------

  useEffect(() => {
    function handleMessage(event: MessageEvent<HostToWebviewMessage>) {
      const msg = event.data;

      if (msg.type === 'addFile') {
        const tagged: LogEntry[] = msg.entries.map(e => ({
          ...e,
          logFile: msg.fileName,
        }));
        setFiles(prev => {
          const next = new Map(prev);
          next.set(msg.filePath, { fileName: msg.fileName, entries: tagged });
          return next;
        });
        // Auto-activate the first file to arrive
        setActiveTab(prev => prev === '' ? msg.filePath : prev);

      } else if (msg.type === 'refreshFile') {
        setFiles(prev => {
          const existing = prev.get(msg.filePath);
          if (!existing) {
            return prev;
          }
          const tagged: LogEntry[] = msg.entries.map(e => ({
            ...e,
            logFile: existing.fileName,
          }));
          const next = new Map(prev);
          next.set(msg.filePath, { ...existing, entries: tagged });
          return next;
        });

      } else if (msg.type === 'removeFile') {
        setFiles(prev => {
          const next = new Map(prev);
          next.delete(msg.filePath);
          return next;
        });
        setActiveTab(prev => {
          if (prev !== msg.filePath) {
            return prev;
          }
          // Activate the next available tab
          const remaining = [...files.keys()].filter(k => k !== msg.filePath);
          if (remaining.length >= 2) {
            return 'merged';
          }
          return remaining[0] ?? '';
        });

      } else if (msg.type === 'error') {
        setErrorMessage(msg.message);
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [files]);

  // -------------------------------------------------------------------------
  // Close tab (initiated from TabBar via custom event)
  // -------------------------------------------------------------------------

  useEffect(() => {
    function handleCloseTab(e: Event) {
      const filePath = (e as CustomEvent<string>).detail;
      setFiles(prev => {
        const next = new Map(prev);
        next.delete(filePath);
        return next;
      });
      setActiveTab(prev => {
        if (prev !== filePath) {
          return prev;
        }
        const remaining = [...files.keys()].filter(k => k !== filePath);
        if (remaining.length >= 2) {
          return 'merged';
        }
        return remaining[0] ?? '';
      });
    }

    window.addEventListener('closeFileTab', handleCloseTab);
    return () => window.removeEventListener('closeFileTab', handleCloseTab);
  }, [files]);

  // -------------------------------------------------------------------------
  // Drag-and-drop files onto the panel
  // -------------------------------------------------------------------------

  // Use a ref so the drop handler always has the latest vscodeApi without
  // needing to re-register the event listener on every render.
  const vscodeApiRef = useRef(vscodeApi);
  vscodeApiRef.current = vscodeApi;

  useEffect(() => {
    function onDragOver(e: DragEvent) {
      e.preventDefault();
    }
    function onDrop(e: DragEvent) {
      e.preventDefault();
      const paths: string[] = [];
      for (const file of Array.from(e.dataTransfer?.files ?? [])) {
        // In VS Code's Electron environment, File objects expose a .path property
        const p = (file as File & { path?: string }).path;
        if (p) {
          paths.push(p);
        }
      }
      if (paths.length > 0) {
        vscodeApiRef.current.postMessage({ type: 'openFiles', paths });
      }
    }

    document.addEventListener('dragover', onDragOver);
    document.addEventListener('drop', onDrop);
    return () => {
      document.removeEventListener('dragover', onDragOver);
      document.removeEventListener('drop', onDrop);
    };
  }, []);

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const tabs: FileTab[] = useMemo(
    () =>
      [...files.entries()].map(([filePath, data]) => ({
        filePath,
        fileName: data.fileName,
        entryCount: data.entries.length,
      })),
    [files]
  );

  const activeEntries: LogEntry[] = useMemo(() => {
    if (activeTab === 'merged') {
      const all = [...files.values()].flatMap(f => f.entries);
      // Sort merged entries chronologically by UTC timestamp
      all.sort((a, b) => (a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0));
      return all;
    }
    return files.get(activeTab)?.entries ?? [];
  }, [files, activeTab]);

  const activeFileName = useMemo(() => {
    if (activeTab === 'merged') {
      return 'Merged view';
    }
    return files.get(activeTab)?.fileName ?? '';
  }, [files, activeTab]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    setSearch('');
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (errorMessage && files.size === 0) {
    return (
      <div className="app-error">
        <strong>Error:</strong> {errorMessage}
      </div>
    );
  }

  if (files.size === 0) {
    return (
      <div className="app-loading">
        <span className="loading-spinner" />
        <span>Parsing log file…</span>
      </div>
    );
  }

  return (
    <div className="app-root">
      {tabs.length >= 1 && (
        <TabBar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      )}
      <Toolbar
        fileName={activeFileName}
        entryCount={activeEntries.length}
        search={search}
        onSearchChange={setSearch}
      />
      <div className="app-grid-container">
        <LogTable
          entries={activeEntries}
          quickFilterText={search}
          showLogFileColumn={activeTab === 'merged'}
        />
      </div>
    </div>
  );
}
