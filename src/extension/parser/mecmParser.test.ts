import { describe, it, expect } from 'vitest';
import { parseLogContent } from './mecmParser.js';
import { Severity } from '../../shared/types.js';

const MODERN_LINE =
  '<![LOG[Installing update]LOG]!><time="08:30:15.123+480" date="07-01-2025" component="CcmExec" context="" type="1" thread="1234" file="update.cpp:89">';

const WARNING_LINE =
  '<![LOG[Low disk space]LOG]!><time="09:00:00.000+480" date="07-01-2025" component="CAS" context="" type="2" thread="555" file="cas.cpp:10">';

const ERROR_LINE =
  '<![LOG[Fatal error occurred]LOG]!><time="10:00:00.000+480" date="07-01-2025" component="AppEnforce" context="" type="3" thread="999" file="app.cpp:42">';

const TYPE0_LINE =
  '<![LOG[Debug message]LOG]!><time="11:00:00.000+480" date="07-01-2025" component="Trace" context="" type="0" thread="111" file="trace.cpp:1">';

describe('parseLogContent', () => {
  it('parses a single modern-format entry', () => {
    const result = parseLogContent(MODERN_LINE);
    expect(result.entries).toHaveLength(1);
    expect(result.skippedLines).toBe(0);

    const entry = result.entries[0];
    expect(entry.message).toBe('Installing update');
    expect(entry.component).toBe('CcmExec');
    expect(entry.thread).toBe('1234');
    expect(entry.sourceFile).toBe('update.cpp:89');
    expect(entry.severity).toBe(Severity.Info);
    expect(entry.id).toBe('0');
  });

  it('assigns sequential ids to multiple entries', () => {
    const content = [MODERN_LINE, WARNING_LINE, ERROR_LINE].join('\n');
    const result = parseLogContent(content);
    expect(result.entries.map(e => e.id)).toEqual(['0', '1', '2']);
  });

  it('maps type=1 to Info, type=2 to Warning, type=3 to Error', () => {
    const content = [MODERN_LINE, WARNING_LINE, ERROR_LINE].join('\n');
    const result = parseLogContent(content);
    expect(result.entries[0].severity).toBe(Severity.Info);
    expect(result.entries[1].severity).toBe(Severity.Warning);
    expect(result.entries[2].severity).toBe(Severity.Error);
  });

  it('maps type=0 to Info (edge case from production logs)', () => {
    const result = parseLogContent(TYPE0_LINE);
    expect(result.entries[0].severity).toBe(Severity.Info);
  });

  it('handles multi-line messages (continuation lines)', () => {
    const content = MODERN_LINE + '\n\tcontinuation line 1\n\tcontinuation line 2';
    const result = parseLogContent(content);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].message).toContain('Installing update');
    expect(result.entries[0].message).toContain('continuation line 1');
    expect(result.entries[0].message).toContain('continuation line 2');
  });

  it('strips UTF-8 BOM from the beginning of the file', () => {
    const content = '\uFEFF' + MODERN_LINE;
    const result = parseLogContent(content);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].message).toBe('Installing update');
  });

  it('normalises CRLF line endings', () => {
    const content = MODERN_LINE + '\r\n' + WARNING_LINE;
    const result = parseLogContent(content);
    expect(result.entries).toHaveLength(2);
  });

  it('skips truncated first line silently without throwing', () => {
    const truncated = '" type="0" thread="1234" file="trace.cpp:1">';
    const content = truncated + '\n' + MODERN_LINE;
    const result = parseLogContent(content);
    expect(result.entries).toHaveLength(1);
    expect(result.skippedLines).toBe(1);
  });

  it('returns empty result for an empty file', () => {
    const result = parseLogContent('');
    expect(result.entries).toHaveLength(0);
    expect(result.skippedLines).toBe(0);
  });

  it('returns empty result for a whitespace-only file', () => {
    const result = parseLogContent('   \n  \n  ');
    expect(result.entries).toHaveLength(0);
    expect(result.skippedLines).toBe(0);
  });

  it('converts UTC timestamp correctly for +480 offset (UTC+8)', () => {
    // time="08:30:15.123+480" date="07-01-2025"
    // Local: 2025-07-01 08:30:15.123 UTC+8
    // UTC: 2025-07-01 00:30:15.123Z (08:30 - 480min = 00:30)
    const result = parseLogContent(MODERN_LINE);
    expect(result.entries[0].timestamp).toBe('2025-07-01T00:30:15.123Z');
  });

  it('formats display timestamp as MM/DD/YYYY HH:MM:SS.mmm', () => {
    const result = parseLogContent(MODERN_LINE);
    expect(result.entries[0].timestampDisplay).toBe('07/01/2025 08:30:15.123');
  });

  it('handles multiple entries in order with correct ids', () => {
    const lines = Array.from({ length: 5 }, (_, i) =>
      `<![LOG[Message ${i}]LOG]!><time="0${i}:00:00.000+000" date="01-01-2026" component="Comp" context="" type="1" thread="${i}" file="f.cpp:${i}">`
    ).join('\n');
    const result = parseLogContent(lines);
    expect(result.entries).toHaveLength(5);
    result.entries.forEach((e, i) => {
      expect(e.id).toBe(String(i));
      expect(e.message).toBe(`Message ${i}`);
    });
  });
});
