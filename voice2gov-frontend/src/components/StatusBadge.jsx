// src/components/StatusBadge.jsx

const STATUS_CLASS = {
  Submitted:   'badge-submitted',
  Acknowledged:'badge-progress',
  'In Progress':'badge-progress',
  Resolved:    'badge-resolved',
  Rejected:    'badge-rejected',
  Escalated:   'badge-escalated',
  Open:        'badge-open',
};

const PRIORITY_CLASS = {
  Critical: 'badge-critical',
  High:     'badge-high',
  Medium:   'badge-medium',
  Low:      'badge-low',
};

const PRIORITY_COLOR = {
  Critical: 'var(--red)',
  High:     'var(--amber)',
  Medium:   'var(--blue)',
  Low:      'var(--green)',
};

export function StatusBadge({ status }) {
  return <span className={`badge ${STATUS_CLASS[status] || 'badge-submitted'}`}>{status}</span>;
}

export function PriorityBadge({ label }) {
  return <span className={`badge ${PRIORITY_CLASS[label] || 'badge-medium'}`}>{label}</span>;
}

export function PriorityBar({ score, label }) {
  return (
    <div className="progress-bar">
      <div className="progress-fill" style={{ width:`${score * 10}%`, background: PRIORITY_COLOR[label] || 'var(--blue)' }} />
    </div>
  );
}

export function priorityColor(label) {
  return PRIORITY_COLOR[label] || 'var(--blue)';
}
