import { LogEntry } from '../../shared/types.js';
import { isModernFormatLine, parseModernLine } from './modernFormat.js';

export interface ParseResult {
  entries: LogEntry[];
  skippedLines: number;
}

/**
 * Parses an entire MECM log file content string into structured LogEntry objects.
 *
 * Handles:
 * - UTF-8 BOM at the start of the file
 * - CRLF line endings
 * - Multi-line log messages (continuation lines without metadata)
 * - Truncated/partial lines (skipped silently)
 */
export function parseLogContent(content: string): ParseResult {
  // Normalise: strip BOM, normalise line endings
  const normalised = content
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const lines = normalised.split('\n');
  const entries: LogEntry[] = [];
  let skippedLines = 0;
  let idCounter = 0;

  let pendingEntry: LogEntry | null = null;
  const continuationLines: string[] = [];

  function flushPending(): void {
    if (pendingEntry === null) return;
    if (continuationLines.length > 0) {
      pendingEntry.message =
        pendingEntry.message + '\n' + continuationLines.join('\n');
      continuationLines.length = 0;
    }
    entries.push(pendingEntry);
    pendingEntry = null;
  }

  for (const line of lines) {
    if (line.trim() === '') continue;

    if (isModernFormatLine(line)) {
      flushPending();
      const entry = parseModernLine(line, idCounter);
      if (entry !== null) {
        idCounter++;
        pendingEntry = entry;
      } else {
        skippedLines++;
      }
    } else if (pendingEntry !== null) {
      // Continuation line — append to current entry's message
      continuationLines.push(line);
    } else {
      // Line before first valid entry (e.g., truncated metadata fragment)
      skippedLines++;
    }
  }

  flushPending();

  return { entries, skippedLines };
}
