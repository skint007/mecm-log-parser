import { useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  type ColDef,
  type GetRowIdParams,
  type RowClassParams,
  themeQuartz,
  AllCommunityModule,
  ModuleRegistry,
} from 'ag-grid-community';
import type { LogEntry } from '../../shared/types.js';
import { Severity } from '../../shared/types.js';
import { SeverityBadge } from './SeverityBadge.js';

// AG Grid 33 requires explicit module registration.
ModuleRegistry.registerModules([AllCommunityModule]);

// AG Grid 33's withParams() processes colors in JavaScript (to compute derived
// values), so CSS variable strings like 'var(--vscode-*)' are not resolved.
// We must read the actual computed values at startup via getComputedStyle.
function buildVsCodeTheme() {
  const s = getComputedStyle(document.body);
  const get = (v: string, fallback: string) => s.getPropertyValue(v).trim() || fallback;
  const isDark = document.body.getAttribute('data-vscode-theme-kind') !== 'vscode-light';

  return themeQuartz.withParams({
    backgroundColor:            get('--vscode-editor-background',                isDark ? '#1e1e1e' : '#ffffff'),
    foregroundColor:            get('--vscode-editor-foreground',                isDark ? '#d4d4d4' : '#333333'),
    borderColor:                get('--vscode-panel-border',                     isDark ? '#474747' : '#d4d4d4'),
    chromeBackgroundColor:      get('--vscode-editorGroupHeader-tabsBackground', isDark ? '#252526' : '#f3f3f3'),
    headerBackgroundColor:      get('--vscode-editorGroupHeader-tabsBackground', isDark ? '#252526' : '#f3f3f3'),
    headerTextColor:            get('--vscode-editor-foreground',                isDark ? '#d4d4d4' : '#333333'),
    rowHoverColor:              get('--vscode-list-hoverBackground',             isDark ? '#2a2d2e' : '#f0f0f0'),
    selectedRowBackgroundColor: get('--vscode-list-activeSelectionBackground',   isDark ? '#094771' : '#0060c0'),
    oddRowBackgroundColor:      get('--vscode-editor-background',                isDark ? '#1e1e1e' : '#ffffff'),
    menuBackgroundColor:        get('--vscode-editorWidget-background',          isDark ? '#252526' : '#f3f3f3'),
    browserColorScheme:         isDark ? 'dark' : 'light',
  });
}

const gridTheme = buildVsCodeTheme();

interface LogTableProps {
  entries: LogEntry[];
}

export function LogTable({ entries }: LogTableProps) {
  const columnDefs = useMemo<ColDef<LogEntry>[]>(
    () => [
      {
        field: 'timestampDisplay',
        headerName: 'Timestamp',
        width: 190,
        minWidth: 150,
        resizable: true,
        sortable: true,
        filter: 'agTextColumnFilter',
        // Sort by the UTC ISO string for correct chronological ordering
        comparator: (_a, _b, nodeA, nodeB) => {
          const tsA = nodeA.data?.timestamp ?? '';
          const tsB = nodeB.data?.timestamp ?? '';
          return tsA < tsB ? -1 : tsA > tsB ? 1 : 0;
        },
      },
      {
        field: 'severity',
        headerName: 'Severity',
        width: 100,
        minWidth: 80,
        resizable: true,
        sortable: true,
        filter: 'agNumberColumnFilter',
        cellRenderer: (params: { value: Severity }) => (
          <SeverityBadge severity={params.value} />
        ),
      },
      {
        field: 'component',
        headerName: 'Component',
        width: 160,
        minWidth: 100,
        resizable: true,
        sortable: true,
        filter: 'agTextColumnFilter',
      },
      {
        field: 'thread',
        headerName: 'Thread',
        width: 90,
        minWidth: 70,
        resizable: true,
        sortable: true,
        filter: 'agTextColumnFilter',
      },
      {
        field: 'message',
        headerName: 'Message',
        flex: 1,
        minWidth: 200,
        resizable: true,
        sortable: true,
        filter: 'agTextColumnFilter',
        wrapText: true,
        autoHeight: true,
        cellStyle: { whiteSpace: 'pre-wrap', lineHeight: '1.4' },
      },
      {
        field: 'sourceFile',
        headerName: 'Source File',
        width: 200,
        minWidth: 120,
        resizable: true,
        sortable: true,
        filter: 'agTextColumnFilter',
      },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      movable: true,
      suppressMovable: false,
    }),
    []
  );

  const getRowId = useCallback(
    (params: GetRowIdParams<LogEntry>) => params.data.id,
    []
  );

  const getRowClass = useCallback(
    (params: RowClassParams<LogEntry>): string | undefined => {
      if (!params.data) return undefined;
      if (params.data.severity === Severity.Error) return 'row-error';
      if (params.data.severity === Severity.Warning) return 'row-warning';
      return undefined;
    },
    []
  );

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <AgGridReact<LogEntry>
        theme={gridTheme}
        rowData={entries}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        getRowId={getRowId}
        getRowClass={getRowClass}
        rowBuffer={20}
        suppressCellFocus={false}
        enableCellTextSelection={true}
        suppressColumnVirtualisation={false}
        domLayout="normal"
      />
    </div>
  );
}
