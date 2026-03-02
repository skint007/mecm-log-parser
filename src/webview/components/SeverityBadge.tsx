import { Severity } from '../../shared/types.js';

const SEVERITY_LABEL: Record<Severity, string> = {
  [Severity.Info]: 'Info',
  [Severity.Warning]: 'Warn',
  [Severity.Error]: 'Error',
};

const SEVERITY_CLASS: Record<Severity, string> = {
  [Severity.Info]: 'severity-info',
  [Severity.Warning]: 'severity-warning',
  [Severity.Error]: 'severity-error',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`severity-badge ${SEVERITY_CLASS[severity]}`}>
      {SEVERITY_LABEL[severity]}
    </span>
  );
}
