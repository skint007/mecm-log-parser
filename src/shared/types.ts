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
}

// ---------------------------------------------------------------------------
// Messages: extension host → webview
// ---------------------------------------------------------------------------

export interface LoadFileMessage {
  type: 'loadFile';
  fileName: string;
  filePath: string;
  entries: LogEntry[];
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export type HostToWebviewMessage = LoadFileMessage | ErrorMessage;

// ---------------------------------------------------------------------------
// Messages: webview → extension host
// ---------------------------------------------------------------------------

export interface ReadyMessage {
  type: 'ready';
}

export type WebviewToHostMessage = ReadyMessage;
