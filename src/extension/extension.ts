import * as vscode from 'vscode';
import { LogViewerProvider } from './providers/logViewerProvider.js';

export function activate(context: vscode.ExtensionContext): void {
  const provider = new LogViewerProvider(context.extensionUri);

  const openFileCmd = vscode.commands.registerCommand(
    'mecmLogViewer.openFile',
    async (uri?: vscode.Uri) => {
      let uris: vscode.Uri[];

      if (uri) {
        // Triggered from explorer context menu — open the right-clicked file
        uris = [uri];
      } else {
        // Triggered from command palette — show a multi-select file picker
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
