/**
 * TaskTracker — Live task management panel.
 * Shows all tasks with status controls (Pending → In Progress → Completed).
 */

const STATUS_COLORS = {
  pending:     'var(--status-pending)',
  in_progress: 'var(--status-in_progress)',
  completed:   'var(--status-completed)',
};

const STATUS_LABELS = {
  pending:     'Pending',
  in_progress: 'In Progress',
  completed:   'Completed',
};

const STATUS_ICONS = {
  pending:     '⏳',
  in_progress: '🔄',
  completed:   '✅',
};

function timeSince(isoString) {
  if (!isoString) return '—';
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (diff < 60)   return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

export default function TaskTracker({ tasks, incidents, onUpdateTask }) {
  const pending     = (tasks || []).filter(t => t.status === 'pending');
  const in_progress = (tasks || []).filter(t => t.status === 'in_progress');
  const completed   = (tasks || []).filter(t => t.status === 'completed');

  // Build incident lookup map
  const incidentMap = (incidents || []).reduce((acc, i) => {
    acc[i.id] = i;
    return acc;
  }, {});

  return (
    <div style={{ padding: '10px', height: '100%', overflowY: 'auto' }}>
      {/* Stats Bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        {[
          { label: 'Pending', count: pending.length, color: 'var(--status-pending)' },
          { label: 'In Progress', count: in_progress.length, color: 'var(--status-in_progress)' },
          { label: 'Completed', count: completed.length, color: 'var(--status-completed)' },
        ].map(({ label, count, color }) => (
          <div key={label} style={{
            flex: 1,
            textAlign: 'center',
            padding: '8px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace' }}>{count}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* All tasks — active first */}
      {(tasks || []).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          No tasks yet — trigger an incident to auto-generate tasks.
        </div>
      ) : (
        [...pending, ...in_progress, ...completed].map(task => (
          <TaskRow
            key={task.id}
            task={task}
            incident={incidentMap[task.incident_id]}
            onUpdateTask={onUpdateTask}
          />
        ))
      )}
    </div>
  );
}

function TaskRow({ task, incident, onUpdateTask }) {
  const color = STATUS_COLORS[task.status];
  const responseTime = task.response_time_seconds;

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderLeft: `3px solid ${color}`,
      borderRadius: 8,
      padding: '10px 12px',
      marginBottom: 6,
      opacity: task.status === 'completed' ? 0.7 : 1,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 12 }}>{STATUS_ICONS[task.status]}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
              {task.staff_name}
            </span>
            <span style={{
              fontSize: 9,
              padding: '1px 6px',
              borderRadius: 100,
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {task.role}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            {task.description}
          </div>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <div style={{ fontSize: 10, color, fontWeight: 600 }}>
            {STATUS_LABELS[task.status]}
          </div>
          {incident && (
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
              Inc #{task.incident_id}
            </div>
          )}
        </div>
      </div>

      {/* Timestamps + Response time */}
      <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
        <MetaSmall label="Created" value={timeSince(task.created_at) + ' ago'} />
        {task.started_at && <MetaSmall label="Started" value={timeSince(task.started_at) + ' ago'} />}
        {responseTime != null && (
          <MetaSmall
            label="Response"
            value={`${responseTime}s`}
            color={responseTime > 300 ? 'var(--clr-critical)' : 'var(--clr-low)'}
          />
        )}
      </div>

      {/* Action buttons — only if not completed */}
      {task.status !== 'completed' && onUpdateTask && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {task.status === 'pending' && (
            <button className="btn" style={{ fontSize: 11, padding: '4px 10px' }}
              onClick={() => onUpdateTask(task.id, 'in_progress')}>
              ▶ Start
            </button>
          )}
          {task.status === 'in_progress' && (
            <button className="btn btn-resolve" style={{ fontSize: 11, padding: '4px 10px' }}
              onClick={() => onUpdateTask(task.id, 'completed')}>
              ✓ Complete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function MetaSmall({ label, value, color }) {
  return (
    <div>
      <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}:{' '}
      </span>
      <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: color ?? 'var(--text-secondary)' }}>
        {value}
      </span>
    </div>
  );
}
