import * as vscode from 'vscode';
import { LogViewerProvider } from './providers/logViewerProvider.js';

export function activate(context: vscode.ExtensionContext): void {
  // Status bar item — always visible, shows aggregate entry/error/warning counts
  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBar.command = 'mecmLogViewer.openFile';
  statusBar.tooltip = 'MECM Log Viewer — click to open a log file';
  context.subscriptions.push(statusBar);

  const provider = new LogViewerProvider(context.extensionUri, statusBar);

  const openFileCmd = vscode.commands.registerCommand(
    'mecmLogViewer.openFile',
    async (uri?: vscode.Uri) => {
      let uris: vscode.Uri[];

      if (uri) {
        uris = [uri];
      } else {
        const picked = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: true,
          filters: { 'Log files': ['log'], 'All files': ['*'] },
          title: 'Open MECM Log File(s)',
        });
        if (!picked || picked.length === 0) {
          return;
        }
        uris = picked;
      }

      await provider.openLogFiles(uris);
    }
  );

  context.subscriptions.push(openFileCmd);
}

export function deactivate(): void {
  // Panels and watchers are disposed via their onDidDispose handlers.
}
