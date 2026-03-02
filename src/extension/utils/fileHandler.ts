import * as vscode from 'vscode';

export class FileReadError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'FileReadError';
  }
}

/**
 * Reads a file from the VS Code virtual filesystem and returns its content
 * as a UTF-8 string. The BOM character (if present) is preserved so the
 * parser can detect and strip it explicitly.
 *
 * @throws FileReadError if the file cannot be read.
 */
export async function readLogFile(uri: vscode.Uri): Promise<string> {
  let bytes: Uint8Array;
  try {
    bytes = await vscode.workspace.fs.readFile(uri);
  } catch (err) {
    throw new FileReadError(
      `Failed to read log file: ${uri.fsPath}`,
      uri.fsPath,
      err
    );
  }

  const decoder = new TextDecoder('utf-8');
  return decoder.decode(bytes);
}
