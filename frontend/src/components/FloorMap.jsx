/**
 * FloorMap — Color-coded grid showing hotel floors.
 *
 * Each floor row shows rooms. Rooms are colored by:
 *   red    = danger zone (in affected_zones of a critical incident)
 *   yellow = warning zone (adjacent floor)
 *   green  = safe
 *
 * Staff are shown as colored dots overlaid on their current floor.
 */

const FLOORS = 8;          // hotel floors (1–8)
const ROOMS_PER_FLOOR = 8; // rooms per floor (01–08)

const ROLE_COLORS = {
  security:     '#3b82f6',
  medical:      '#ff9f0a',
  housekeeping: '#a78bfa',
  manager:      '#30d158',
};

function getFloorStatus(floor, incidents) {
  let worstStatus = 'safe';
  for (const inc of incidents) {
    if (inc.status === 'resolved') continue;
    const zones = (inc.affected_zones || []).map(z => z.toLowerCase());
    const floorStr = `floor ${floor}`.toLowerCase();
    
    if (zones.includes(floorStr) || inc.floor === floor) {
      if (inc.status === 'predicted') {
        if (worstStatus === 'safe') worstStatus = 'predicted';
        continue;
      }
      if (inc.severity === 'critical') return 'critical';
      if (inc.severity === 'high') { worstStatus = 'high'; continue; }
      if (inc.severity === 'medium' && (worstStatus === 'safe' || worstStatus === 'predicted')) { 
        worstStatus = 'medium'; 
      }
    }
  }
  return worstStatus;
}

function floorStatusColor(status) {
  return {
    critical: '#ff2d55',
    high:     '#ff9f0a',
    medium:   '#ffd60a',
    predicted:'#5e5ce6', // Purple for predictive
    safe:     '#1c7a3e',
  }[status] ?? '#1c7a3e';
}

function floorStatusBg(status) {
  return {
    critical: 'rgba(255,45,85,0.12)',
    high:     'rgba(255,159,10,0.10)',
    medium:   'rgba(255,214,10,0.08)',
    predicted:'rgba(94, 92, 230, 0.08)',
    safe:     'rgba(28,122,62,0.06)',
  }[status] ?? 'rgba(28,122,62,0.06)';
}

export default function FloorMap({ incidents, staff, selectedIncidentId }) {
  const allIncidents = incidents || [];
  const selectedInc = allIncidents.find(i => i.id === selectedIncidentId) || allIncidents.find(i => i.severity === 'critical' && i.status === 'active');
  
  // Parse evacuation path
  const evacPath = (selectedInc?.evacuation_path || []).map(step => {
    const [f, r] = step.split(',').map(Number);
    return { floor: f, room: r };
  });

  const floorStatusMap = {};
  for (let f = 1; f <= FLOORS; f++) {
    floorStatusMap[f] = getFloorStatus(f, allIncidents);
  }

  const staffByFloor = {};
  for (const s of (staff || [])) {
    const f = s.current_floor;
    if (!staffByFloor[f]) staffByFloor[f] = [];
    staffByFloor[f].push(s);
  }

  const activeIncidents = allIncidents.filter(i => i.status === 'active');

  return (
    <div style={{ padding: '10px', height: '100%', overflowY: 'auto' }}>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Critical', color: '#ff2d55' },
          { label: 'Predictive', color: '#5e5ce6' },
          { label: 'Safe', color: '#30d158' },
          { label: 'Exit Path', color: '#00ffff' },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#8a93a8' }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
            {label}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {Array.from({ length: FLOORS }, (_, i) => FLOORS - i).map(floor => {
          const status = floorStatusMap[floor] || 'safe';
          const floorStaff = staffByFloor[floor] || [];
          const floorIncidents = allIncidents.filter(i => i.floor === floor && i.status !== 'resolved');
          const isEmergency = floorIncidents.some(i => i.status === 'active');
          const isScanning = floorIncidents.some(i => i.status === 'predicted');
          
          const rowColor = floorStatusColor(status);
          const rowBg = floorStatusBg(status);

          return (
            <div
              key={floor}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: rowBg,
                border: `1px solid ${isEmergency ? rowColor : (isScanning ? '#5e5ce6' : 'rgba(255,255,255,0.06)')}`,
                borderRadius: 10,
                padding: '8px 12px',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {isScanning && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  background: 'linear-gradient(90deg, transparent, rgba(94, 92, 230, 0.1), transparent)',
                  animation: 'scanning 2s infinite linear',
                  zIndex: 0
                }} />
              )}

              {/* Floor label */}
              <div style={{
                width: 60, fontSize: 11, fontWeight: 800,
                fontFamily: 'JetBrains Mono, monospace',
                color: rowColor, flexShrink: 0, zIndex: 1
              }}>
                {isEmergency && <span style={{ marginRight: 4 }}>🚨</span>}
                {isScanning && <span style={{ marginRight: 4 }}>📡</span>}
                FL-{floor}
              </div>

              {/* Room cells */}
              <div style={{ display: 'flex', gap: 4, flex: 1, zIndex: 1 }}>
                {Array.from({ length: ROOMS_PER_FLOOR }, (_, ri) => {
                  const roomNum = ri + 1;
                  const roomLabel = `${floor}0${roomNum}`.slice(-3);
                  const roomIncident = floorIncidents.find(i => i.location?.includes(roomLabel));
                  
                  const isPathStep = evacPath.some(step => step.floor === floor && step.room === roomNum);
                  
                  let cellColor = roomIncident
                    ? floorStatusColor(roomIncident.status === 'predicted' ? 'predicted' : roomIncident.severity)
                    : (status === 'safe' ? 'rgba(255,255,255,0.04)' : `${rowColor}22`);

                  if (isPathStep && !roomIncident) {
                    cellColor = 'rgba(0, 255, 255, 0.25)';
                  }

                  return (
                    <div
                      key={roomLabel}
                      style={{
                        flex: 1, height: 26, background: cellColor,
                        borderRadius: 5, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 9,
                        color: roomIncident ? '#fff' : (isPathStep ? '#00ffff' : 'rgba(255,255,255,0.3)'),
                        fontFamily: 'JetBrains Mono, monospace',
                        border: isPathStep ? '1px solid #00ffff' : '1px solid rgba(255,255,255,0.05)',
                        position: 'relative',
                        boxShadow: isPathStep ? '0 0 10px rgba(0, 255, 255, 0.4)' : 'none'
                      }}
                    >
                      {roomIncident?.status === 'active' && (roomIncident.severity === 'critical' || roomIncident.severity === 'high') && (
                        <div className="pulse-bg" style={{ position: 'absolute', inset: 0, background: 'rgba(255,45,85,0.3)' }} />
                      )}
                      {roomIncident ? (roomIncident.status === 'predicted' ? '👁️' : '🚨') : (isPathStep ? '➡️' : roomLabel)}
                    </div>
                  );
                })}
              </div>

              {/* Staff */}
              <div style={{ display: 'flex', gap: 4, width: 80, justifyContent: 'flex-end', zIndex: 1 }}>
                {floorStaff.map(s => (
                  <div
                    key={s.id}
                    title={`${s.name} (${s.role})`}
                    style={{
                      width: 12, height: 12, borderRadius: '50%',
                      background: ROLE_COLORS[s.role] || '#8e8e93',
                      boxShadow: s.available ? `0 0 10px ${ROLE_COLORS[s.role]}cc` : 'none',
                      border: '2px solid rgba(255,255,255,0.2)',
                      transition: 'all 0.5s ease'
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
