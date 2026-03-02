import * as vscode from 'vscode';
import * as path from 'path';
import { readLogFile } from '../utils/fileHandler.js';
import { parseLogContent } from '../parser/mecmParser.js';
import { Severity } from '../../shared/types.js';
import type {
  HostToWebviewMessage,
  WebviewToHostMessage,
} from '../../shared/types.js';

interface FileStats {
  total: number;
  errors: number;
  warnings: number;
}

export class LogViewerProvider {
  private panel: vscode.WebviewPanel | undefined;
  private isReady = false;
  private pendingUris: vscode.Uri[] = [];
  private loadedPaths = new Set<string>();
  private watchers = new Map<string, vscode.Disposable>();
  private fileStats = new Map<string, FileStats>();

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly statusBar: vscode.StatusBarItem,
  ) {}

  /**
   * Opens one or more log files in the shared viewer panel.
   * Already-open files are skipped; new files are added as tabs.
   */
  async openLogFiles(uris: vscode.Uri[]): Promise<void> {
    const newUris = uris.filter(u => !this.loadedPaths.has(u.fsPath));

    if (!this.panel) {
      this.createPanel();
    } else {
      this.panel.reveal();
    }

    // Mark paths as loading immediately to prevent duplicate loads
    for (const uri of newUris) {
      this.loadedPaths.add(uri.fsPath);
    }

    if (newUris.length === 0) {
      return;
    }

    if (this.isReady) {
      await this.loadFiles(newUris);
    } else {
      this.pendingUris.push(...newUris);
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private createPanel(): void {
    const nonce = generateNonce();

    this.panel = vscode.window.createWebviewPanel(
      'mecmLogViewer',
      'MECM Log Viewer',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.extensionUri, 'dist'),
        ],
      }
    );

    this.panel.webview.html = this.buildHtml(this.panel.webview, nonce);

    this.panel.webview.onDidReceiveMessage(
      async (message: WebviewToHostMessage) => {
        if (message.type === 'ready') {
          this.isReady = true;
          const pending = this.pendingUris.splice(0);
          if (pending.length > 0) {
            await this.loadFiles(pending);
          }
        } else if (message.type === 'closeFile') {
          this.handleCloseFile(message.filePath);
        } else if (message.type === 'openFiles') {
          const uris = message.paths.map(p => vscode.Uri.file(p));
          await this.openLogFiles(uris);
        }
      }
    );

    this.panel.onDidDispose(() => {
      this.panel = undefined;
      this.isReady = false;
      this.pendingUris = [];
      this.loadedPaths.clear();
      this.fileStats.clear();
      this.statusBar.hide();
      for (const w of this.watchers.values()) {
        w.dispose();
      }
      this.watchers.clear();
    });
  }

  private async loadFiles(uris: vscode.Uri[]): Promise<void> {
    await Promise.all(uris.map(uri => this.loadFile(uri)));
  }

  private async loadFile(uri: vscode.Uri): Promise<void> {
    const filePath = uri.fsPath;
    const fileName = path.basename(filePath);

    if (!this.panel) {
      return;
    }

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Parsing ${fileName}…`,
          cancellable: false,
        },
        async () => {
          const config = vscode.workspace.getConfiguration('mecmLogViewer');
          const maxEntries = config.get<number>('maxEntries', 0);
          const defaultSeverityFilter = config.get<string>('defaultSeverityFilter', 'all');

          const content = await readLogFile(uri);
          let { entries, skippedLines } = parseLogContent(content);

          if (maxEntries > 0 && entries.length > maxEntries) {
            entries = entries.slice(0, maxEntries);
          }

          this.fileStats.set(filePath, {
            total: entries.length,
            errors: entries.filter(e => e.severity === Severity.Error).length,
            warnings: entries.filter(e => e.severity === Severity.Warning).length,
          });
          this.updateStatusBar();

          const defaultFilterPreset: 'all' | 'warnings+' | 'errors' =
            defaultSeverityFilter === 'warnings+' || defaultSeverityFilter === 'errors'
              ? defaultSeverityFilter
              : 'all';

          const msg: HostToWebviewMessage = {
            type: 'addFile',
            fileName,
            filePath,
            entries,
            defaultFilterPreset,
            skippedLines,
          };
          this.panel?.webview.postMessage(msg);
          this.setupWatcher(uri);

          if (skippedLines > 0) {
            void vscode.window.showInformationMessage(
              `${fileName}: ${skippedLines} line(s) could not be parsed and were skipped.`
            );
          }
        }
      );
    } catch (err) {
      const msg: HostToWebviewMessage = {
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      };
      this.panel?.webview.postMessage(msg);
      void vscode.window.showErrorMessage(
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  private setupWatcher(uri: vscode.Uri): void {
    const filePath = uri.fsPath;
    if (this.watchers.has(filePath)) {
      return;
    }

    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(
        vscode.Uri.file(path.dirname(filePath)),
        path.basename(filePath)
      )
    );

    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    const onChange = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        if (!this.panel) {
          return;
        }
        try {
          const config = vscode.workspace.getConfiguration('mecmLogViewer');
          const maxEntries = config.get<number>('maxEntries', 0);

          const content = await readLogFile(uri);
          let { entries } = parseLogContent(content);

          if (maxEntries > 0 && entries.length > maxEntries) {
            entries = entries.slice(0, maxEntries);
          }

          this.fileStats.set(filePath, {
            total: entries.length,
            errors: entries.filter(e => e.severity === Severity.Error).length,
            warnings: entries.filter(e => e.severity === Severity.Warning).length,
          });
          this.updateStatusBar();

          const msg: HostToWebviewMessage = {
            type: 'refreshFile',
            filePath,
            entries,
          };
          this.panel.webview.postMessage(msg);
        } catch {
          // Silently ignore refresh errors (e.g. file temporarily locked)
        }
      }, 500);
    };

    watcher.onDidChange(onChange);

    this.watchers.set(filePath, {
      dispose: () => {
        clearTimeout(debounceTimer);
        watcher.dispose();
      },
    });
  }

  private handleCloseFile(filePath: string): void {
    this.loadedPaths.delete(filePath);
    this.fileStats.delete(filePath);
    this.updateStatusBar();
    const watcher = this.watchers.get(filePath);
    if (watcher) {
      watcher.dispose();
      this.watchers.delete(filePath);
    }
  }

  private updateStatusBar(): void {
    if (this.fileStats.size === 0) {
      this.statusBar.hide();
      return;
    }

    let total = 0, errors = 0, warnings = 0;
    for (const stats of this.fileStats.values()) {
      total += stats.total;
      errors += stats.errors;
      warnings += stats.warnings;
    }

    this.statusBar.text =
      `$(list-unordered) ${total.toLocaleString()}  $(error) ${errors.toLocaleString()}  $(warning) ${warnings.toLocaleString()}`;
    this.statusBar.show();
  }

  private buildHtml(webview: vscode.Webview, nonce: string): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview.js')
    );
    const agGridCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'ag-grid.css')
    );
    const agGridThemeCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'ag-theme-quartz.css')
    );
    const webviewCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview.css')
    );

    const csp = [
      `default-src 'none'`,
      `script-src 'nonce-${nonce}'`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `font-src ${webview.cspSource} data:`,
      `img-src ${webview.cspSource} data:`,
    ].join('; ');

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <title>MECM Log Viewer</title>
  <link rel="stylesheet" href="${agGridCssUri}">
  <link rel="stylesheet" href="${agGridThemeCssUri}">
  <link rel="stylesheet" href="${webviewCssUri}">
</head>
<body>
  <div id="root"></div>
  <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function generateNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 32 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}
