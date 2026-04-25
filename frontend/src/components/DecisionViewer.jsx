import React from 'react';

/**
 * DecisionViewer — Shows the XAI (Explainable AI) reasoning 
 * for the currently active or selected incident.
 */
export default function DecisionViewer({ activeIncident, t }) {
  if (!activeIncident) {
    return (
      <div style={{ 
        padding: 20, 
        textAlign: 'center', 
        color: 'var(--text-muted)',
        background: 'var(--bg-card)',
        borderRadius: 12,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        border: '1px dashed var(--border)'
      }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🧠</div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{t('Awaiting Intelligence Input')}</div>
        <div style={{ fontSize: 11, marginTop: 4 }}>{t('Select an active incident to view reasoning.')}</div>
        <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
        <button className="btn btn-secondary" 
          onClick={(e) => { e.stopPropagation(); onExplainWhy?.(activeIncident); }}
          style={{ flex: 1, height: 26, fontSize: 9 }}>
          {t('Explain Why')}
        </button>
        <button className="btn btn-secondary" 
          onClick={(e) => { e.stopPropagation(); onForensics?.(activeIncident); }}
          style={{ flex: 1, height: 26, fontSize: 9 }}>
          {t('Forensics')}
        </button>
      </div>
      </div>
    );
  }

  const steps = activeIncident.explanation ? activeIncident.explanation.split(' -> ') : [];
  const whyNotSteps = activeIncident.why_not_explanation ? activeIncident.why_not_explanation.split(' | ') : [];

  return (
    <div style={{ 
      padding: '15px 20px', 
      height: '100%', 
      overflowY: 'auto',
      background: 'var(--bg-card)',
      borderRadius: 12,
      border: `1px solid ${activeIncident.status === 'predicted' ? 'var(--clr-high)' : 'var(--border)'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
        <div style={{ 
           width: 32, height: 32, borderRadius: 8, 
           background: 'var(--accent-low)', color: 'var(--accent)',
           display: 'flex', alignItems: 'center', justifyContent: 'center',
           fontSize: 18
        }}>🧠</div>
        <div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            {t('Intelligence Engine Reasoning')}
          </h3>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t('Decision Path for')} #{activeIncident.id}
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', paddingLeft: 20 }}>
        {/* Vertical line */}
        <div style={{ 
          position: 'absolute', left: 4, top: 10, bottom: 10, 
          width: 2, background: 'var(--border)', opacity: 0.5 
        }} />

        {steps.map((step, idx) => (
          <div key={idx} style={{ position: 'relative', marginBottom: 16 }}>
            {/* Timeline dot */}
            <div style={{ 
              position: 'absolute', left: -20, top: 4, 
              width: 10, height: 10, borderRadius: '50%', 
              background: idx === steps.length - 1 ? 'var(--accent)' : 'var(--border)',
              border: '2px solid var(--bg-card)',
              zIndex: 1
            }} />
            
            <div style={{ 
              fontSize: 12, 
              lineHeight: 1.5, 
              color: idx === steps.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: idx === steps.length - 1 ? 600 : 400
            }}>
              {step}
            </div>
          </div>
        ))}
      </div>

      {whyNotSteps.length > 0 && whyNotSteps[0] !== "" && (
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            🚫 {t('Omitted Actions (Why Not)')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {whyNotSteps.map((step, idx) => (
              <div key={idx} style={{ 
                fontSize: 11, color: 'var(--text-secondary)', 
                background: 'rgba(255,255,255,0.02)', padding: '8px 12px', 
                borderRadius: 6, borderLeft: '2px solid var(--border)' 
              }}>
                {step}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeIncident.status === 'predicted' && (
        <div style={{ 
          marginTop: 20, padding: 12, borderRadius: 8, 
          background: 'rgba(255, 159, 10, 0.1)', border: '1px solid rgba(255, 159, 10, 0.2)' 
        }}>
          <div style={{ color: 'var(--clr-high)', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
            ⚠️ {t('PREDICTIVE ALERT ACTIVE')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            {t('System has deployed precautionary protocols based on sensor trend analysis.')}
          </div>
        </div>
      )}
    </div>
  );
}
