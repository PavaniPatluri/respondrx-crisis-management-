/**
 * IncidentPanel — Active + past + predicted incidents list.
 * Shows type, location, severity, and interactive action buttons.
 */

const TYPE_ICONS = {
  fire:     '🔥',
  medical:  '🚑',
  security: '🔒',
  flood:    '🌊',
  power:    '⚡',
  smoke:    '🌫️',
  temp:     '🌡️',
};

function timeSince(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function IncidentPanel({ incidents, tasks, onResolve, onSelectIncident, activeIncidentId, onAcknowledge, onExplainWhy, onForensics, t }) {
  const active = (incidents || []).filter(i => i.status === 'active' || i.status === 'predicted');
  const resolved = (incidents || []).filter(i => i.status === 'resolved');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px' }}>
      {/* Active Incidents */}
      {active.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
          No active incidents or risks
        </div>
      ) : (
        active.map(inc => {
          const incTasks = (tasks || []).filter(t => t.incident_id === inc.id);
          const completedCount = incTasks.filter(t => t.status === 'completed').length;
          const progress = incTasks.length > 0 ? Math.round((completedCount / incTasks.length) * 100) : 0;

          return (
            <IncidentCard
              key={inc.id}
              incident={inc}
              progress={progress}
              taskCount={incTasks.length}
              completedCount={completedCount}
              onResolve={onResolve}
              onAcknowledge={onAcknowledge}
              onSelect={() => onSelectIncident(inc)}
              isSelected={activeIncidentId === inc.id}
              isActive={inc.status === 'active'}
              isPredicted={inc.status === 'predicted'}
              onExplainWhy={onExplainWhy}
              onForensics={onForensics}
              t={t}
            />
          );
        })
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 8 }}>
            Resolved History ({resolved.length})
          </div>
          {resolved.slice(0, 5).map(inc => (
            <IncidentCard 
              key={inc.id} 
              incident={inc} 
              isActive={false} 
              onSelect={() => onSelectIncident(inc)}
              isSelected={activeIncidentId === inc.id}
              onExplainWhy={onExplainWhy}
              onForensics={onForensics}
              t={t}
            />
          ))}
        </>
      )}
    </div>
  );
}

function IncidentCard({ incident: inc, progress, taskCount, completedCount, onResolve, onSelect, isSelected, isActive, isPredicted, onAcknowledge, onExplainWhy, onForensics, t }) {
  const borderColor = isPredicted ? 'var(--clr-high)' : (isActive ? severityBorder(inc.severity) : 'var(--border)');
  const statusColor = isPredicted ? 'var(--clr-high)' : 'var(--text-primary)';

  return (
    <div 
      onClick={onSelect}
      style={{
        background: isSelected ? 'rgba(0, 122, 255, 0.05)' : 'var(--bg-card)',
        border: `1px solid ${isSelected ? 'var(--accent)' : borderColor}`,
        borderRadius: 10,
        padding: '10px 12px',
        opacity: (isActive || isPredicted || isSelected) ? 1 : 0.55,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{isPredicted ? '📡' : (TYPE_ICONS[inc.type] ?? '⚠️')}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: statusColor, textTransform: 'capitalize' }}>
              {isPredicted ? t('PREDICTIVE ALERT') : `${t(inc.type)} ${t('Incident')}`}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
              📍 {inc.location}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span className={`badge badge-${inc.severity}`}>{isPredicted ? t('WARNING') : t(inc.severity)}</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            {isPredicted ? 'RISK PROJ' : `#${inc.id}`}
          </span>
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
        <Meta label={t('Impact')} value={`${inc.impact_score}/100`} accent={inc.impact_score > 70} t={t} />
        <Meta label={t('Fail Prediction')} value={inc.time_to_critical > 0 ? `${inc.time_to_critical}s` : t('CRITICAL')} accent={inc.time_to_critical < 60} t={t} />
        <Meta label={t('Floor')} value={`FL-${inc.floor}`} t={t} />
        <Meta label={t('Age')} value={timeSince(inc.timestamp)} t={t} />
        {inc.vip_present && <Meta label={t('VIP')} value={`⚡ ${t('EXCLUSIVE')}`} accent t={t} />}
      </div>

      {/* Action Buttons */}
      <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
        <button className="btn btn-secondary" 
          onClick={(e) => { e.stopPropagation(); onExplainWhy?.(inc); }}
          style={{ flex: 1, height: 26, fontSize: 9 }}>
          {t('Explain Why')}
        </button>
        <button className="btn btn-secondary" 
          onClick={(e) => { e.stopPropagation(); onForensics?.(inc); }}
          style={{ flex: 1, height: 26, fontSize: 9 }}>
          {t('Forensics')}
        </button>
      </div>

      {/* Task Progress */}
      {isActive && taskCount > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 100, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: progress === 100 ? 'var(--clr-low)' : 'var(--accent)',
              borderRadius: 100,
              transition: 'all 0.4s ease',
            }} />
          </div>
        </div>
      )}

      {/* Resolve / Acknowledge row */}
      {isActive && (
        <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
          {onAcknowledge && (
            <button className="btn btn-secondary" 
              onClick={(e) => { e.stopPropagation(); onAcknowledge(inc.id); }}
              style={{ flex: 1, height: 28, fontSize: 10, background: 'rgba(255,255,255,0.05)', borderColor: 'var(--accent)' }}>
              🤝 {t('Acknowledge')}
            </button>
          )}
          {onResolve && (
            <button className="btn btn-resolve" onClick={(e) => { e.stopPropagation(); onResolve(inc.id); }}
              style={{ flex: 1, justifyContent: 'center', fontSize: 10, height: 28 }}>
              ✓ {t('Resolve')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Meta({ label, value, accent }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: accent ? 'var(--accent)' : 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
        {value}
      </div>
    </div>
  );
}

function severityBorder(severity) {
  return {
    critical: 'rgba(255,45,85,0.5)',
    high:     'rgba(255,159,10,0.4)',
    medium:   'rgba(255,214,10,0.3)',
    low:      'rgba(48,209,88,0.3)',
  }[severity] ?? 'var(--border)';
}
