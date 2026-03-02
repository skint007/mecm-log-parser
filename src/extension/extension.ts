import * as vscode from 'vscode';
import { LogViewerProvider } from './providers/logViewerProvider.js';

export function activate(context: vscode.ExtensionContext): void {
  const provider = new LogViewerProvider(context.extensionUri);

  const openFileCmd = vscode.commands.registerCommand(
    'mecmLogViewer.openFile',
    async (uri?: vscode.Uri) => {
      let targetUri = uri;

      if (!targetUri) {
        // Triggered from command palette — show a file picker
        const picked = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          filters: { 'Log files': ['log'], 'All files': ['*'] },
          title: 'Open MECM Log File',
        });
        if (!picked || picked.length === 0) {
          return;
        }
        targetUri = picked[0];
      }

      await provider.openLogFile(targetUri);
    }
  );

  context.subscriptions.push(openFileCmd);
}

export function deactivate(): void {
  // Panels are disposed via their onDidDispose handlers; nothing extra needed.
}
