/**
 * Analytics — Post-incident statistics panel.
 * Displays total response time, completion rate, and delay stats
 * for each resolved incident.
 */

function fmt(seconds) {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function Analytics({ analytics }) {
  if (!analytics || analytics.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
        <div style={{ fontSize: 13 }}>No resolved incidents yet</div>
        <div style={{ fontSize: 11, marginTop: 4 }}>Analytics appear after incidents are resolved.</div>
      </div>
    );
  }

  // Summary totals
  const total = analytics.length;
  const avgResponse = Math.round(
    analytics.filter(a => a.total_response_time != null)
      .reduce((sum, a) => sum + a.total_response_time, 0) / total
  );
  const totalDelayed = analytics.reduce((sum, a) => sum + (a.delayed_tasks || 0), 0);

  return (
    <div style={{ padding: '10px', height: '100%', overflowY: 'auto' }}>
      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <SummaryCard label="Incidents Resolved" value={total} color="var(--clr-low)" />
        <SummaryCard label="Avg Response Time" value={fmt(avgResponse)} color="var(--accent)" />
        <SummaryCard label="Delayed Tasks" value={totalDelayed} color={totalDelayed > 0 ? 'var(--clr-critical)' : 'var(--clr-low)'} />
      </div>

      {/* Per-incident logs */}
      {analytics.map(log => (
        <LogRow key={log.id} log={log} />
      ))}
    </div>
  );
}

function LogRow({ log }) {
  const completionRate = log.total_tasks > 0
    ? Math.round((log.completed_tasks / log.total_tasks) * 100)
    : 0;

  const TYPE_ICONS = {
    fire: '🔥', medical: '🚑', security: '🔒',
    flood: '🌊', power: '⚡', smoke: '🌫️', temp: '🌡️',
  };

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '10px 12px',
      marginBottom: 8,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{TYPE_ICONS[log.incident_type] ?? '⚠️'}</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize', color: 'var(--text-primary)' }}>
              {log.incident_type} — {log.location}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {new Date(log.logged_at).toLocaleString()}
            </div>
          </div>
        </div>
        <span className={`badge badge-${log.severity}`}>{log.severity}</span>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <Stat label="Response Time" value={fmt(log.total_response_time)} />
        <Stat label="Tasks Done"    value={`${log.completed_tasks}/${log.total_tasks}`} />
        <Stat
          label="Delays"
          value={log.delayed_tasks > 0 ? `${log.delayed_tasks} ⚠` : '0'}
          color={log.delayed_tasks > 0 ? 'var(--clr-high)' : 'var(--clr-low)'}
        />
      </div>

      {/* Completion bar */}
      <div style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-muted)', marginBottom: 3 }}>
          <span>Completion Rate</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{completionRate}%</span>
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 100 }}>
          <div style={{
            height: '100%',
            width: `${completionRate}%`,
            background: completionRate === 100 ? 'var(--clr-low)' : 'var(--accent)',
            borderRadius: 100,
          }} />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div style={{
      flex: 1,
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '10px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 6,
      padding: '6px 8px',
    }}>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: color ?? 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}
