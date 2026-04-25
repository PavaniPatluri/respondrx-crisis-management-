/**
 * Dashboard — Main Command Center Layout v3.0
 * 
 * Column 1 (Left):   Critical Incidents + Risk Projections
 * Column 2 (Center): Tactical HUD (Map) + Operational Forensics (Reasoning/Replay)
 * Column 3 (Right):  Response Coordination (Tasks) + Staff Roster
 */

import { useState } from 'react';
import IncidentPanel from './IncidentPanel';
import FloorMap      from './FloorMap';
import TaskTracker   from './TaskTracker';
import StaffPanel    from './StaffPanel';
import Analytics     from './Analytics';
import MissionControl from './MissionControl';
import DecisionViewer from './DecisionViewer';
import IncidentReplay from './IncidentReplay';

export default function Dashboard({
  user, incidents, staff, tasks, analytics, toasts, connected,
  language, setLanguage, t, audioArmed, onTestBeep, onPlayAlertSound, onAcknowledgeAlert,
  onTriggerIncident, onRunDemo, onUpdateTask,
  onResolveIncident, onResetStaff, onClearAll, onSimulateIoT, onLogout, onSimulateFailure, backendUrl,
  onPlayVoice,
}) {
  const [activeIncident, setActiveIncident] = useState(null);
  const [centerBottomTab, setCenterBottomTab] = useState('reasoning'); // reasoning | forensics | tasks
  const [rightTab, setRightTab] = useState('alerts');
  
  const [customForm, setCustomForm] = useState({ type: 'fire', location: '', vip: false });
  const [iotForm, setIotForm] = useState({ sensor: 'smoke', value: '', location: '' });

  const activeCount   = (incidents || []).filter(i => i.status === 'active').length;
  const pendingTasks  = (tasks || []).filter(t => t.status === 'pending').length;
  const availableStaff = (staff || []).filter(s => s.available).length;

  const activeTask = tasks?.find(t => t.incident_id === activeIncident?.id && t.status !== 'completed' && t.status !== 'failed');

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-base)' }}>
      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <header style={{
        display: 'flex', alignItems: 'center', padding: '0 16px', height: 48,
        borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)',
        flexShrink: 0, gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🛡️</span>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            ⚡ {t('RespondrX')}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            | {t('Smart Crisis Management')}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 14, marginLeft: 'auto' }}>
          {availableStaff === 0 && (
            <div style={{ 
              display: 'flex', alignItems: 'center', background: 'rgba(255, 68, 68, 0.2)', 
              color: 'var(--clr-critical)', padding: '0 12px', borderRadius: '4px',
              border: '1px solid var(--clr-critical)', fontWeight: 700, fontSize: 11,
              animation: 'pulse 1.5s infinite', textTransform: 'uppercase'
            }}>
              ⚠️ {t('System Understaffed')}
            </div>
          )}
          <HeaderStat label={t('Active')} value={activeCount} color={activeCount > 0 ? 'var(--clr-critical)' : 'var(--clr-low)'} />
          <HeaderStat label={t('Pending')} value={pendingTasks} color={pendingTasks > 0 ? 'var(--clr-high)' : 'var(--text-muted)'} />
          <HeaderStat label={t('Staff')} value={availableStaff} color="var(--clr-low)" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 16, fontSize: 11, color: connected ? 'var(--clr-low)' : 'var(--clr-critical)' }}>
          <div className={`dot dot-${connected ? 'low' : 'critical'}`} style={{ width: 7, height: 7 }} />
          {connected ? t('LINK ACTIVE') : t('NO CONNECTION')}
        </div>


        <div style={{ marginLeft: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <select 
            value={language} 
            onChange={e => setLanguage(e.target.value)}
            style={{ 
              background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid var(--border)', 
              borderRadius: '4px', padding: '2px 8px', fontSize: '11px', outline: 'none', cursor: 'pointer' 
            }}
          >
            <option value="en" style={{ background: '#1a1a1a', color: '#fff' }}>English</option>
            <option value="hi" style={{ background: '#1a1a1a', color: '#fff' }}>हिंदी (Hindi)</option>
            <option value="te" style={{ background: '#1a1a1a', color: '#fff' }}>తెలుగు (Telugu)</option>
          </select>
          <div style={{ fontSize: 11, padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', textTransform: 'uppercase', color: '#fff' }}>
            👤 {user?.username} ({user?.role})
          </div>
          <button 
            onClick={onLogout}
            style={{ background: 'transparent', border: '1px solid var(--clr-critical)', color: 'var(--clr-critical)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: 10, fontWeight: 'bold' }}
          >
            {t('Logout')}
          </button>
        </div>
      </header>

      {/* ── Main Layout ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* ── LEFT: Critical Incidents ──────────────────────────────────────── */}
        {user?.role !== 'viewer' && (
          <div style={{
            width: 340, display: 'flex', flexDirection: 'column',
            borderRight: '1px solid var(--border)', flexShrink: 0,
            background: 'rgba(0,0,0,0.15)', overflowY: 'auto'
          }}>
            {user?.role === 'admin' || user?.role === 'staff' ? (
              <>
                <div style={{ padding: 12 }}>
                  <MissionControl 
                    onAction={(action, data) => {
                      if (action === 'test-audio') {
                        onPlayVoice?.(data, language, 'normal');
                      }
                    }} 
                    onPlaySound={() => {}}
                    t={t} 
                    tasks={tasks}
                    incidents={incidents}
                    onUpdateTask={onUpdateTask}
                    onSimulateFailure={onSimulateFailure}
                    backendUrl={backendUrl}
                  />
                </div>
                
                {/* Failure Simulator Panel */}
                <div style={{ padding: '0 12px 12px' }}>
                  <div style={{ 
                    background: 'rgba(255, 68, 68, 0.05)', border: '1px solid rgba(255,68,68,0.2)', 
                    borderRadius: 8, padding: 12 
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--clr-critical)', marginBottom: 8, textTransform: 'uppercase' }}>
                      {t('Failure Simulator')}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        className="btn" 
                        onClick={() => onSimulateFailure('staff', { staff_id: staff[0]?.id || 1, incident_id: activeIncident?.id })}
                        style={{ flex: 1, fontSize: 10, padding: '6px', background: 'rgba(255,255,255,0.05)', opacity: activeIncident ? 1 : 0.5 }}
                        disabled={!activeIncident}
                      >
                        {t('Kill Staff')}
                      </button>
                      <button 
                        className="btn" 
                        onClick={() => onSimulateFailure('exit', { incident_id: activeIncident?.id })}
                        style={{ flex: 1, fontSize: 10, padding: '6px', background: 'rgba(255,255,255,0.05)', opacity: activeIncident ? 1 : 0.5 }}
                        disabled={!activeIncident}
                      >
                        {t('Block Exit')}
                      </button>
                      <button 
                        className="btn" 
                        onClick={() => onSimulateFailure('delay', { task_id: activeTask?.id })}
                        style={{ flex: 1, fontSize: 10, padding: '6px', background: 'rgba(255,255,255,0.05)', opacity: activeTask ? 1 : 0.5 }}
                        disabled={!activeTask}
                      >
                        {t('Delay Task')}
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '0 12px 12px' }}>
                  <button className="btn btn-reset" onClick={onClearAll} style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}>
                    🗑️ {t('Full System Reset')}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
                📡 {t('Mission Control Access Restricted')}
              </div>
            )}

            <div className="card-header" style={{ padding: '10px 14px', position: 'sticky', top: 0, background: 'var(--bg-panel)', zIndex: 10 }}>
              ⚡ {t('Live Situation Feed')}
            </div>
            <IncidentPanel 
              incidents={incidents} 
              tasks={tasks}
              onResolve={user?.role === 'admin' ? onResolveIncident : null}
              onAcknowledge={onAcknowledgeAlert}
              onSelectIncident={setActiveIncident}
              activeIncidentId={activeIncident?.id}
              onExplainWhy={(inc) => { setActiveIncident(inc); }}
              onForensics={(inc) => { onRunDemo('replay-start', { incident_id: inc.id }); }}
              t={t}
              role={user?.role}
            />
          </div>
        )}

        {/* ── CENTER: Tactical HUD (Map) + Decision Intelligence ─────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
          {/* Map Section (60%) */}
          <div style={{ height: '60%', borderBottom: '1px solid var(--border)', position: 'relative' }}>
             <div className="card-header" style={{ position: 'absolute', top: 10, left: 10, zIndex: 5, background: 'rgba(0,0,0,0.6)', border: '1px solid var(--border)', borderRadius: 6 }}>
               🗺️ {t('Tactical Spatial Awareness')}
             </div>
             <FloorMap incidents={incidents} staff={staff} />
          </div>

          {/* Intelligence & Forensics Section (40%) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-panel)' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
              {user?.role !== 'staff' && (
                <>
                  <div className={`tab ${centerBottomTab === 'reasoning' ? 'active' : ''}`} style={{ flex: 1, padding: '10px 0', cursor: 'pointer', textAlign: 'center', fontSize: 11 }} onClick={() => setCenterBottomTab('reasoning')}>
                    🧠 {t('Decision Intelligence')}
                  </div>
                  <div className={`tab ${centerBottomTab === 'forensics' ? 'active' : ''}`} style={{ flex: 1, padding: '10px 0', cursor: 'pointer', textAlign: 'center', fontSize: 11 }} onClick={() => setCenterBottomTab('forensics')}>
                    📼 {t('Forensic Timeline')}
                  </div>
                </>
              )}
              {user?.role === 'staff' && (
                <div style={{ flex: 1, padding: '10px 0', textAlign: 'center', fontSize: 11, fontWeight: 700 }}>
                  📋 {t('My Active Tasks')}
                </div>
              )}
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {user?.role !== 'staff' && centerBottomTab === 'reasoning' && <DecisionViewer activeIncident={activeIncident} t={t} />}
              {user?.role !== 'staff' && centerBottomTab === 'forensics' && <IncidentReplay incidentId={activeIncident?.id} />}
              {user?.role === 'staff' && <TaskTracker tasks={tasks} incidents={incidents} onUpdateTask={onUpdateTask} />}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Staff Roster & Analytics & Alerts ───────────────────────── */}
        {user?.role !== 'viewer' && (
          <div style={{ width: 280, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 3, marginBottom: 8 }}>
              <button className={`tab-sm ${rightTab === 'alerts' ? 'active' : ''}`} onClick={() => setRightTab('alerts')}>{t('Alerts')}</button>
              <button className={`tab-sm ${rightTab === 'staff' ? 'active' : ''}`} onClick={() => setRightTab('staff')}>{t('Staff')}</button>
              <button className={`tab-sm ${rightTab === 'impact' ? 'active' : ''}`} onClick={() => setRightTab('impact')}>{t('Impact')}</button>
            </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {rightTab === 'alerts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
                {(toasts || []).slice().reverse().map(t => (
                  <div key={t.id} style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border-accent)',
                    borderLeft: `3px solid ${t.type === 'critical' ? 'var(--clr-critical)' : t.type === 'high' ? 'var(--clr-high)' : t.type === 'success' ? 'var(--clr-low)' : 'var(--accent)'}`,
                    borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: 'var(--text-primary)'
                  }}>
                    <strong style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>System Alert</strong>
                    {t.message}
                  </div>
                ))}
                {(!toasts || toasts.length === 0) && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '20px' }}>No active alerts</div>
                )}
              </div>
            )}
            {rightTab === 'staff' && (
              <StaffPanel staff={staff} t={t} />
            )}
            {rightTab === 'analytics' && <Analytics analytics={analytics} />}
          </div>

          {/* Predictor Control (Bottom of Right) */}
          {(user?.role === 'admin' || user?.role === 'staff') && (
            <div style={{ padding: 12, borderTop: '1px solid var(--border)', background: 'var(--bg-panel)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--clr-high)', marginBottom: 8, textTransform: 'uppercase' }}>
                📡 Predictive Risk Simulator
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <select 
                  style={selectStyle}
                  value={iotForm.sensor}
                  onChange={e => setIotForm(f => ({ ...f, sensor: e.target.value }))}
                >
                  <option value="smoke">Smoke Sensor (ppm)</option>
                  <option value="temp">Thermal Sensor (°C)</option>
                </select>
                <div style={{ display: 'flex', gap: 4 }}>
                  <input 
                    style={inputStyle} type="number" placeholder="Value" 
                    value={iotForm.value} onChange={e => setIotForm(f => ({ ...f, value: e.target.value }))}
                  />
                  <button className="btn" onClick={() => onSimulateIoT(iotForm.sensor, parseFloat(iotForm.value), 'Floor 3 Central')}>
                    Sim
                  </button>
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                  *Values &gt; 40°C or 30ppm trigger predictive logic.
                </div>
              </div>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({ children, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      style={{
        flex: 1, padding: '10px 0', background: active ? 'rgba(0,122,255,0.08)' : 'none',
        border: 'none', borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontSize: 11, fontWeight: active ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s'
      }}
    >
      {children}
    </button>
  );
}

function HeaderStat({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 16, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  );
}

const inputStyle = {
  width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 6, padding: '6px 10px', color: 'var(--text-primary)', fontSize: 12, outline: 'none',
};

const selectStyle = { ...inputStyle };
