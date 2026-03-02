export enum Severity {
  Info = 1,
  Warning = 2,
  Error = 3,
}

export interface LogEntry {
  /** Unique row identifier (generated at parse time). */
  id: string;
  /** ISO 8601 UTC timestamp string — used for chronological sorting. */
  timestamp: string;
  /** Display timestamp in "MM/DD/YYYY HH:MM:SS.mmm" format — preserves local time. */
  timestampDisplay: string;
  severity: Severity;
  component: string;
  thread: string;
  /** Full log message, may be multi-line. */
  message: string;
  /** Source file + line from the log metadata, e.g. "update.cpp:89". */
  sourceFile: string;
  /** Execution context, usually empty string. */
  context: string;
  /** Basename of the log file this entry came from — set by the webview for merged view. */
  logFile?: string;
}

// ---------------------------------------------------------------------------
// Messages: extension host → webview
// ---------------------------------------------------------------------------

export interface AddFileMessage {
  type: 'addFile';
  fileName: string;
  filePath: string;
  entries: LogEntry[];
}

export interface RefreshFileMessage {
  type: 'refreshFile';
  filePath: string;
  entries: LogEntry[];
}

export interface RemoveFileMessage {
  type: 'removeFile';
  filePath: string;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export type HostToWebviewMessage =
  | AddFileMessage
  | RefreshFileMessage
  | RemoveFileMessage
  | ErrorMessage;

// ---------------------------------------------------------------------------
// Messages: webview → extension host
// ---------------------------------------------------------------------------

export interface ReadyMessage {
  type: 'ready';
}

export interface CloseFileMessage {
  type: 'closeFile';
  filePath: string;
}

export interface OpenFilesMessage {
  type: 'openFiles';
  paths: string[];
}

export type WebviewToHostMessage = ReadyMessage | CloseFileMessage | OpenFilesMessage;
