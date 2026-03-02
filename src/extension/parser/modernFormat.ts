import { LogEntry, Severity } from '../../shared/types.js';

// Matches the standard MECM modern log line format.
// Groups: 1=message, 2=time, 3=date, 4=component, 5=context, 6=type, 7=thread, 8=file
const MODERN_LINE_RE =
  /^<!\[LOG\[([\s\S]*?)\]LOG\]!><time="([^"]+)" date="([^"]+)" component="([^"]*)" context="([^"]*)" type="(\d+)" thread="([^"]*)" file="([^"]*)"/;

// Matches time field: HH:MM:SS.mmm[+-]offset (offset in minutes)
const TIME_RE = /^(\d{2}):(\d{2}):(\d{2})\.(\d{3})([+-])(\d+)$/;

/**
 * Tests whether a raw text line begins a new modern-format MECM log entry.
 * Handles BOM prefix on the first line of a file.
 */
export function isModernFormatLine(line: string): boolean {
  return line.startsWith('<![LOG[') || line.startsWith('\uFEFF<![LOG[');
}

/**
 * Parses a single modern-format log line into a LogEntry.
 * Returns null if the line does not match (e.g., truncated first line).
 *
 * @param rawLine  The raw text of the log line (after CRLF normalisation).
 * @param idCounter A monotonically increasing integer for generating a unique id.
 */
export function parseModernLine(
  rawLine: string,
  idCounter: number
): LogEntry | null {
  const match = MODERN_LINE_RE.exec(rawLine);
  if (!match) {
    return null;
  }

  const [, rawMessage, timeStr, dateStr, component, context, typeStr, thread, sourceFile] =
    match;

  const timestamp = parseTimestamp(dateStr, timeStr);
  const severity = parseSeverity(typeStr);

  return {
    id: String(idCounter),
    timestamp: timestamp ? timestamp.toISOString() : '',
    timestampDisplay: formatDisplayTimestamp(dateStr, timeStr),
    severity,
    component,
    thread,
    message: rawMessage,
    sourceFile,
    context,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseSeverity(typeStr: string): Severity {
  const n = parseInt(typeStr, 10);
  if (n === 2) return Severity.Warning;
  if (n === 3) return Severity.Error;
  // type=0 (debug/verbose in some logs), type=1 (info) → Info
  return Severity.Info;
}

function parseTimestamp(dateStr: string, timeStr: string): Date | null {
  // dateStr: MM-DD-YYYY
  const dateParts = dateStr.split('-');
  if (dateParts.length !== 3) return null;
  const [month, day, year] = dateParts.map(Number);

  const timeMatch = TIME_RE.exec(timeStr);
  if (!timeMatch) return null;

  const [, hh, mm, ss, ms, sign, offsetStr] = timeMatch;
  const offsetMinutes = parseInt(offsetStr, 10);

  // Build local time as UTC epoch milliseconds
  const localMs = Date.UTC(
    year,
    month - 1,
    day,
    parseInt(hh, 10),
    parseInt(mm, 10),
    parseInt(ss, 10),
    parseInt(ms, 10)
  );

  // MECM offset: +480 means local clock is 480 min ahead of UTC
  // So UTC = local - 480min; '-' sign means UTC = local + offset
  const utcMs =
    sign === '+'
      ? localMs - offsetMinutes * 60_000
      : localMs + offsetMinutes * 60_000;

  return new Date(utcMs);
}

function formatDisplayTimestamp(dateStr: string, timeStr: string): string {
  const dateParts = dateStr.split('-');
  if (dateParts.length !== 3) return `${dateStr} ${timeStr}`;
  const [month, day, year] = dateParts;
  // Strip timezone offset for display readability
  const timePart = timeStr.replace(/[+-]\d+$/, '');
  return `${month}/${day}/${year} ${timePart}`;
}
