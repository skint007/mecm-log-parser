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

// Pass VS Code CSS variable references directly as AG Grid theme params.
// ColorValue accepts any string so `var(--vscode-*)` works fine and AG Grid
// injects these into its own scoped CSS, avoiding any specificity battle.
// browserColorScheme: 'inherit' lets the grid follow VS Code's color-scheme.
const gridTheme = themeQuartz.withParams({
  backgroundColor: 'var(--vscode-editor-background)',
  foregroundColor: 'var(--vscode-editor-foreground)',
  borderColor: 'var(--vscode-panel-border)',
  chromeBackgroundColor: 'var(--vscode-editorGroupHeader-tabsBackground)',
  headerBackgroundColor: 'var(--vscode-editorGroupHeader-tabsBackground)',
  headerTextColor: 'var(--vscode-editor-foreground)',
  rowHoverColor: 'var(--vscode-list-hoverBackground)',
  selectedRowBackgroundColor: 'var(--vscode-list-activeSelectionBackground)',
  oddRowBackgroundColor: 'var(--vscode-editor-background)',
  menuBackgroundColor: 'var(--vscode-editorWidget-background)',
  fontFamily: 'var(--vscode-font-family)',
  fontSize: 'var(--vscode-font-size, 13px)',
  browserColorScheme: 'inherit',
});

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
