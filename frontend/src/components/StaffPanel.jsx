/**
 * StaffPanel — Live staff roster with role, location, and availability status.
 */

const ROLE_ICONS = {
  security:     '🔵',
  medical:      '🟠',
  housekeeping: '🟣',
  manager:      '🟢',
};

const ROLE_COLORS = {
  security:     '#3b82f6',
  medical:      '#ff9f0a',
  housekeeping: '#a78bfa',
  manager:      '#30d158',
};

export default function StaffPanel({ staff, t }) {
  const available = (staff || []).filter(s => s.available);
  const onTask    = (staff || []).filter(s => !s.available);

  // Group by role for organized display
  const grouped = (staff || []).reduce((acc, s) => {
    const r = s.role;
    if (!acc[r]) acc[r] = [];
    acc[r].push(s);
    return acc;
  }, {});

  const roleOrder = ['security', 'medical', 'manager', 'housekeeping'];

  return (
    <div style={{ padding: '10px', height: '100%', overflowY: 'auto' }}>
      {/* Summary bar */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 10,
        padding: '8px 10px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 8,
        border: '1px solid var(--border)',
      }}>
        <Stat label={t('Available')} value={available.length} color="var(--clr-low)" t={t} />
        <Stat label={t('On Task')}   value={onTask.length}    color="var(--clr-high)" t={t} />
        <Stat label={t('Total')}     value={staff?.length ?? 0} color="var(--text-secondary)" t={t} />
      </div>

      {/* Staff by role */}
      {roleOrder.map(role => {
        const members = grouped[role] || [];
        if (members.length === 0) return null;
        return (
          <div key={role} style={{ marginBottom: 10 }}>
            <div style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.06em',
              color: ROLE_COLORS[role],
              textTransform: 'uppercase',
              marginBottom: 5,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}>
              {ROLE_ICONS[role]} {t(role.charAt(0).toUpperCase() + role.slice(1))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {members.map(s => (
                <StaffRow key={s.id} staff={s} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StaffRow({ staff: s, t }) {
  const color = ROLE_COLORS[s.role] ?? '#8a93a8';
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '6px 10px',
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      opacity: s.available ? 1 : 0.6,
    }}>
      {/* Avatar dot */}
      <div style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: `${color}22`,
        border: `1.5px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        flexShrink: 0,
        color,
        fontWeight: 700,
      }}>
        {s.name.charAt(0)}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--text-primary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {s.name}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
          📍 FL-{s.current_floor} · {s.current_location}
        </div>
      </div>

      {/* Status */}
      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 10,
          color: s.available ? 'var(--clr-low)' : 'var(--clr-high)',
          fontWeight: 600,
        }}>
          <div className={`dot dot-${s.available ? 'low' : 'in_progress'}`} style={{ width: 6, height: 6 }} />
          {s.available ? t('Free') : t('Busy')}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color, t }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  );
}
