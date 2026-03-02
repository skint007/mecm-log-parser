import { SeverityBadge } from './SeverityBadge.js';
import type { LogEntry } from '../../shared/types.js';

interface EntryDetailProps {
  entry: LogEntry;
  onClose: () => void;
}

export function EntryDetail({ entry, onClose }: EntryDetailProps) {
  const metaParts = [
    entry.timestampDisplay,
    entry.component || null,
    entry.thread ? `Thread ${entry.thread}` : null,
    entry.sourceFile || null,
    entry.context || null,
  ].filter((p): p is string => Boolean(p));

  return (
    <div className="entry-detail">
      <div className="entry-detail-header">
        <SeverityBadge severity={entry.severity} />
        <span className="entry-detail-meta" title={metaParts.join(' · ')}>
          {metaParts.join(' · ')}
        </span>
        <button
          className="entry-detail-close"
          onClick={onClose}
          title="Close detail panel"
        >
          ×
        </button>
      </div>
      <div className="entry-detail-message">{entry.message}</div>
    </div>
  );
}
