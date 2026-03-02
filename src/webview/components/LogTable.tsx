import { useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  type ColDef,
  type GetRowIdParams,
  type RowClassParams,
  themeQuartz,
  colorSchemeVariable,
  AllCommunityModule,
  ModuleRegistry,
} from 'ag-grid-community';
import type { LogEntry } from '../../shared/types.js';
import { Severity } from '../../shared/types.js';
import { SeverityBadge } from './SeverityBadge.js';

// AG Grid 33 requires explicit module registration.
ModuleRegistry.registerModules([AllCommunityModule]);

// AG Grid 33 theme: quartz base + colorSchemeVariable so AG Grid reads
// colour values from our CSS custom properties (--ag-* mapped to --vscode-*).
const gridTheme = themeQuartz.withPart(colorSchemeVariable);

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
