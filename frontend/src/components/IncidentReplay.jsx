import React, { useState, useEffect } from 'react';

/**
 * IncidentReplay — Forensic timeline playback of an incident's life cycle.
 * Fetches events from /replay/<id> and displays them as a chronological flow.
 */
export default function IncidentReplay({ incidentId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (incidentId) {
      setLoading(true);
      fetch(`http://localhost:5000/replay/${incidentId}`)
        .then(res => res.json())
        .then(data => {
          setEvents(data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to fetch replay data", err);
          setLoading(false);
        });
    }
  }, [incidentId]);

  if (!incidentId) {
    return (
      <div style={{ 
        padding: 20, textAlign: 'center', color: 'var(--text-muted)',
        background: 'var(--bg-card)', borderRadius: 12, height: '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        border: '1px dashed var(--border)'
      }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🕵️‍♂️</div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>No Incident Selected for Forensics</div>
        <div style={{ fontSize: 11, marginTop: 4 }}>Select an incident to view its life cycle timeline.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading forensic data...
      </div>
    );
  }

  return (
    <div style={{ padding: '15px 20px', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ 
           width: 32, height: 32, borderRadius: 8, 
           background: 'rgba(255, 45, 85, 0.1)', color: '#ff2d55',
           display: 'flex', alignItems: 'center', justifyContent: 'center',
           fontSize: 18
        }}>📜</div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            Incident Forensics Timeline
          </h3>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Event-by-Event Life Cycle
          </div>
        </div>
        <button
          onClick={() => fetch(`http://localhost:5000/replay/${incidentId}/start`, { method: 'POST' })}
          style={{
            background: 'var(--accent)', color: '#fff', border: 'none',
            padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
          }}
          title="Emits the replay_started event to demonstrate the feature"
        >
          ▶ PLAY
        </button>
      </div>

      <div style={{ paddingLeft: 10 }}>
        {events.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No events logged for this incident.</div>
        ) : (
          events.map((event, idx) => (
            <div key={event.id} style={{ 
              display: 'flex', gap: 15, marginBottom: 20, position: 'relative' 
            }}>
              {/* Timeline Connector */}
              {idx !== events.length - 1 && (
                <div style={{ 
                  position: 'absolute', left: 7, top: 20, bottom: -20, 
                  width: 1, background: 'var(--border)' 
                }} />
              )}
              
              {/* Dot */}
              <div style={{ 
                width: 14, height: 14, borderRadius: '50%', 
                background: getEventColor(event.event_type), 
                border: '3px solid var(--bg-app)',
                zIndex: 1, flexShrink: 0, marginTop: 4
              }} />

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ 
                    fontSize: 11, fontWeight: 700, color: getEventColor(event.event_type),
                    textTransform: 'uppercase', letterSpacing: '0.05em'
                  }}>
                    {event.event_type.replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {formatTime(event.timestamp)}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {event.description}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function getEventColor(type) {
  if (type.includes('CREATED')) return 'var(--accent)';
  if (type.includes('DECISION')) return '#af52de';
  if (type.includes('ASSIGNED')) return 'var(--clr-low)';
  if (type.includes('DELAYED')) return 'var(--clr-high)';
  if (type.includes('FAILURE')) return 'var(--clr-critical)';
  if (type.includes('SUCCESS')) return 'var(--clr-low)';
  if (type.includes('RESOLVED')) return 'var(--clr-low)';
  return 'var(--text-secondary)';
}

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
