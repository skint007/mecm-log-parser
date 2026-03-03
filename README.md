# MECM Log Viewer

A VS Code extension for parsing and viewing Microsoft Endpoint Configuration Manager (MECM/SCCM) log files in an interactive table.

## Features

- **Interactive table** — sortable, resizable, and filterable columns powered by AG Grid
- **Multi-file tabs** — open several log files simultaneously and switch between them
- **Merged view** — when two or more files are open, a "Merged" tab shows all entries sorted chronologically
- **Severity highlighting** — Info, Warning, and Error rows are colour-coded; quick preset buttons filter by severity
- **Entry detail panel** — click any row to expand the full message, timestamp, component, thread, and source file in a panel at the bottom
- **Column quick-filters** — click a Component or Thread cell to filter by that value; active filters shown as dismissible pills in the toolbar
- **Global search** — full-text quick-filter across all visible columns
- **Keyboard navigation** — `F8` / `Shift+F8` jumps to the next / previous error; `Alt+F8` / `Shift+Alt+F8` navigates warnings
- **File watcher** — the table refreshes automatically when the log file changes on disk
- **Drag-and-drop** — drag `.log` files from Explorer directly onto the viewer panel
- **CSV export** — exports the currently visible (filtered) rows
- **Status bar** — shows a live count of total entries, errors, and warnings across all open files
- **VS Code theme integration** — automatically follows the active light, dark, or high-contrast theme

## Usage

### Opening a log file

Three ways to open a file:

1. **Right-click** any `.log` file in the Explorer sidebar → **Open in MECM Log Viewer**
2. **Editor title bar** — when a `.log` file is open in the editor, click **Open in MECM Log Viewer** in the title bar actions
3. **Command Palette** (`Ctrl+Shift+P`) → **Open in MECM Log Viewer** → pick one or more files from the dialog

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `F8` | Next error |
| `Shift+F8` | Previous error |
| `Alt+F8` | Next warning |
| `Shift+Alt+F8` | Previous warning |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `mecmLogViewer.maxEntries` | `0` | Maximum entries to load per file. `0` = no limit. Entries beyond the limit are discarded from the end of the file. |
| `mecmLogViewer.defaultSeverityFilter` | `"all"` | Severity filter applied automatically when a file is first opened. Options: `all`, `warnings+`, `errors`. |

## Log format

The extension parses the MECM/SCCM modern log format:

```
<![LOG[message text]LOG]!><time="HH:MM:SS.mmm+offset" date="MM-DD-YYYY" component="X" context="" type="1" thread="N" file="source.cpp:LINE">
```

- `type` 1 = Info, 2 = Warning, 3 = Error (0 is treated as Info)
- Multi-line messages are assembled from continuation lines
- Timestamps are converted to UTC for correct chronological sorting in the merged view
- The BOM character and CRLF line endings are handled automatically

## Development

### Prerequisites

- Node.js 20+
- VS Code 1.96+

### Setup

```bash
npm install
```

### Build

```bash
npm run compile        # type-check + build both bundles
npm run watch          # watch mode (extension + webview + tsc in parallel)
npm run package        # minified production build
```

### Tests

```bash
npm test               # run Vitest unit tests (parser)
npm run test:watch     # watch mode
```

### Running the extension locally

Press `F5` in VS Code to launch an Extension Development Host. Right-click any `.log` file in the `Logs/` directory and select **Open in MECM Log Viewer**.

### Project structure

```
src/
├── shared/
│   └── types.ts                    — LogEntry, Severity, postMessage types
├── extension/
│   ├── extension.ts                — activate(), command registration, status bar
│   ├── parser/
│   │   ├── modernFormat.ts         — line parser and UTC timestamp conversion
│   │   ├── mecmParser.ts           — BOM/CRLF normalisation, multi-line assembly
│   │   └── mecmParser.test.ts      — Vitest unit tests
│   ├── providers/
│   │   └── logViewerProvider.ts    — WebviewPanel lifecycle, file watcher, settings
│   └── utils/
│       └── fileHandler.ts          — vscode.workspace.fs wrapper
└── webview/
    ├── index.tsx                   — React entry point
    ├── App.tsx                     — top-level state, message handling
    ├── hooks/
    │   └── useVsCodeApi.tsx        — VS Code API context + ready signal
    ├── components/
    │   ├── LogTable.tsx            — AG Grid table
    │   ├── Toolbar.tsx             — search, filter presets, CSV export
    │   ├── TabBar.tsx              — file tabs + merged tab
    │   ├── EntryDetail.tsx         — selected row detail panel
    │   └── SeverityBadge.tsx       — Info/Warning/Error pill badge
    └── themes/
        └── agGridVscode.css        — VS Code CSS variable mappings + layout
```

### Publishing

```bash
npm version patch      # bumps package.json, commits, and creates a git tag
git push origin main --tags   # triggers the GitHub Actions publish workflow
```

See `.github/workflows/publish.yml` for the CI configuration. A `VSCE_PAT` secret (Azure DevOps Personal Access Token with Marketplace → Manage scope) must be set in the repository settings.

## Tech stack

- **Extension host**: TypeScript, VS Code Extension API
- **Webview**: React 18, AG Grid 33 Community, esbuild
- **Tests**: Vitest
