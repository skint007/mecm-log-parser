import * as vscode from 'vscode';
import * as path from 'path';
import { readLogFile } from '../utils/fileHandler.js';
import { parseLogContent } from '../parser/mecmParser.js';
import type { HostToWebviewMessage, WebviewToHostMessage } from '../../shared/types.js';

export class LogViewerProvider {
  private readonly panels = new Map<string, vscode.WebviewPanel>();

  constructor(private readonly extensionUri: vscode.Uri) {}

  /**
   * Opens (or reveals) a webview panel for the given log file URI.
   */
  async openLogFile(uri: vscode.Uri): Promise<void> {
    const filePath = uri.fsPath;
    const fileName = path.basename(filePath);

    // Reveal existing panel if already open for this file
    const existing = this.panels.get(filePath);
    if (existing) {
      existing.reveal(vscode.ViewColumn.One);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'mecmLogViewer',
      `MECM: ${fileName}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.extensionUri, 'dist'),
        ],
      }
    );

    this.panels.set(filePath, panel);

    panel.onDidDispose(() => {
      this.panels.delete(filePath);
    });

    const nonce = generateNonce();
    panel.webview.html = this.buildHtml(panel.webview, nonce);

    // Send data only after the webview signals it is ready (React has mounted)
    panel.webview.onDidReceiveMessage(
      async (message: WebviewToHostMessage) => {
        if (message.type === 'ready') {
          await this.sendFileData(panel, uri, fileName, filePath);
        }
      }
    );
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async sendFileData(
    panel: vscode.WebviewPanel,
    uri: vscode.Uri,
    fileName: string,
    filePath: string
  ): Promise<void> {
    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Parsing ${fileName}…`,
          cancellable: false,
        },
        async () => {
          const content = await readLogFile(uri);
          const { entries, skippedLines } = parseLogContent(content);

          const msg: HostToWebviewMessage = {
            type: 'loadFile',
            fileName,
            filePath,
            entries,
          };
          panel.webview.postMessage(msg);

          if (skippedLines > 0) {
            vscode.window.showInformationMessage(
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
      panel.webview.postMessage(msg);
      vscode.window.showErrorMessage(
        err instanceof Error ? err.message : String(err)
      );
    }
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
      `font-src ${webview.cspSource}`,
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
