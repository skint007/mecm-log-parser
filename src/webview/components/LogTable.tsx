import {
  useMemo,
  useCallback,
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  type ColDef,
  type GetRowIdParams,
  type RowClassParams,
  type GridApi,
  type GridReadyEvent,
  AllCommunityModule,
  ModuleRegistry,
} from 'ag-grid-community';
import type { LogEntry } from '../../shared/types.js';
import { Severity } from '../../shared/types.js';
import { SeverityBadge } from './SeverityBadge.js';

// AG Grid 33 requires explicit module registration.
ModuleRegistry.registerModules([AllCommunityModule]);

// Apply VS Code theme colors to the AG Grid CSS theme via CSS custom properties
// set directly on the wrapper element. Inline element.style.setProperty() takes
// precedence over any class-scoped AG Grid CSS, so the colors are guaranteed
// to apply correctly regardless of theme or specificity.
function applyVsCodeTheme(el: HTMLElement) {
  const s = getComputedStyle(document.body);
  const get = (v: string, fb: string) => s.getPropertyValue(v).trim() || fb;
  const isDark = document.body.getAttribute('data-vscode-theme-kind') !== 'vscode-light';

  const vars: Record<string, string> = {
    '--ag-background-color':             get('--vscode-editor-background',                isDark ? '#1e1e1e' : '#ffffff'),
    '--ag-foreground-color':             get('--vscode-editor-foreground',                isDark ? '#d4d4d4' : '#333333'),
    '--ag-border-color':                 get('--vscode-panel-border',                     isDark ? '#474747' : '#d4d4d4'),
    '--ag-header-background-color':      get('--vscode-editorGroupHeader-tabsBackground', isDark ? '#252526' : '#f3f3f3'),
    '--ag-header-foreground-color':      get('--vscode-editor-foreground',                isDark ? '#d4d4d4' : '#333333'),
    '--ag-row-hover-color':              get('--vscode-list-hoverBackground',             isDark ? '#2a2d2e' : '#f0f0f0'),
    '--ag-selected-row-background-color':get('--vscode-list-activeSelectionBackground',   isDark ? '#094771' : '#0060c0'),
    '--ag-odd-row-background-color':     get('--vscode-editor-background',                isDark ? '#1e1e1e' : '#ffffff'),
    '--ag-popup-background-color':       get('--vscode-editorWidget-background',          isDark ? '#252526' : '#f3f3f3'),
    '--ag-font-family':                  get('--vscode-font-family',                      'sans-serif'),
    '--ag-font-size':                    get('--vscode-font-size',                        '13px'),
  };

  for (const [prop, value] of Object.entries(vars)) {
    el.style.setProperty(prop, value);
  }
}

export type FilterPreset = 'all' | 'warnings+' | 'errors';

export interface LogTableHandle {
  exportCsv(): void;
  navigateTo(direction: 'next' | 'prev', severity?: Severity): void;
}

interface LogTableProps {
  entries: LogEntry[];
  quickFilterText?: string;
  showLogFileColumn?: boolean;
  filterPreset?: FilterPreset;
  columnFilters?: Record<string, string>;
  onColumnFilterClick?: (field: string, value: string) => void;
}

export const LogTable = forwardRef<LogTableHandle, LogTableProps>(
  function LogTable(
    { entries, quickFilterText, showLogFileColumn, filterPreset, columnFilters, onColumnFilterClick },
    ref
  ) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [gridApi, setGridApi] = useState<GridApi<LogEntry> | null>(null);

    // Stable ref so column defs don't need to be re-memoized when the callback changes
    const onColumnFilterClickRef = useRef(onColumnFilterClick);
    onColumnFilterClickRef.current = onColumnFilterClick;

    useEffect(() => {
      if (wrapperRef.current) {
        applyVsCodeTheme(wrapperRef.current);
      }
    }, []);

    // Apply AG Grid filter model whenever the preset or column filters change
    useEffect(() => {
      if (!gridApi) return;

      const model: Record<string, object> = {};

      if (filterPreset === 'errors') {
        model.severity = { filterType: 'number', type: 'equals', filter: Severity.Error };
      } else if (filterPreset === 'warnings+') {
        model.severity = { filterType: 'number', type: 'greaterThanOrEqual', filter: Severity.Warning };
      }

      for (const [field, value] of Object.entries(columnFilters ?? {})) {
        model[field] = { filterType: 'text', type: 'equals', filter: value };
      }

      void gridApi.setFilterModel(Object.keys(model).length > 0 ? model : null);
    }, [gridApi, filterPreset, columnFilters]);

    useImperativeHandle(ref, () => ({
      exportCsv() {
        gridApi?.exportDataAsCsv({ fileName: 'mecm-log-export.csv' });
      },
      navigateTo(direction, severity) {
        if (!gridApi) return;

        const focused = gridApi.getFocusedCell();
        const currentRowIndex = focused?.rowIndex ?? -1;

        const matches: number[] = [];
        gridApi.forEachNodeAfterFilterAndSort(node => {
          if (node.rowIndex !== null && (!severity || node.data?.severity === severity)) {
            matches.push(node.rowIndex);
          }
        });

        if (matches.length === 0) return;

        let targetIndex: number;
        if (direction === 'next') {
          targetIndex = matches.find(i => i > currentRowIndex) ?? matches[0];
        } else {
          targetIndex =
            [...matches].reverse().find(i => i < currentRowIndex) ??
            matches[matches.length - 1];
        }

        gridApi.ensureIndexVisible(targetIndex, 'middle');
        gridApi.setFocusedCell(targetIndex, 'timestampDisplay');
      },
    }), [gridApi]);

    const onGridReady = useCallback((e: GridReadyEvent<LogEntry>) => {
      setGridApi(e.api);
    }, []);

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
          cellStyle: { cursor: 'pointer' } as Record<string, string>,
          onCellClicked: params => {
            if (params.value != null) {
              onColumnFilterClickRef.current?.('component', String(params.value));
            }
          },
        },
        {
          field: 'thread',
          headerName: 'Thread',
          width: 90,
          minWidth: 70,
          resizable: true,
          sortable: true,
          filter: 'agTextColumnFilter',
          cellStyle: { cursor: 'pointer' } as Record<string, string>,
          onCellClicked: params => {
            if (params.value != null) {
              onColumnFilterClickRef.current?.('thread', String(params.value));
            }
          },
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
        {
          field: 'logFile',
          headerName: 'Log File',
          width: 160,
          minWidth: 100,
          resizable: true,
          sortable: true,
          filter: 'agTextColumnFilter',
          hide: !showLogFileColumn,
        },
      ],
      [showLogFileColumn]
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
      <div ref={wrapperRef} className="ag-theme-quartz" style={{ height: '100%', width: '100%' }}>
        <AgGridReact<LogEntry>
          theme="legacy"
          rowData={entries}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          getRowId={getRowId}
          getRowClass={getRowClass}
          quickFilterText={quickFilterText}
          onGridReady={onGridReady}
          rowBuffer={20}
          suppressCellFocus={false}
          enableCellTextSelection={true}
          suppressColumnVirtualisation={false}
          domLayout="normal"
        />
      </div>
    );
  }
);
