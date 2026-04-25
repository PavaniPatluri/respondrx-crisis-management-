import React, { useState } from 'react';

/**
 * MissionControl — Dashboard controller for triggering scenarios.
 * Designed for high-impact hackathon demos.
 */
export default function MissionControl({ onAction, t, tasks, incidents, onUpdateTask, onSimulateFailure, onPlaySound, backendUrl }) {
  const [loading, setLoading] = useState(null);
  const [location, setLocation] = useState('Room 302');

  const runScenario = async (slug, label) => {
    if (onPlaySound) onPlaySound(slug);
    setLoading(slug);
    try {
      const resp = await fetch(`${backendUrl}/demo/${slug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ location })
      });
      if (resp.ok) {
        console.log(`[Demo] Activated: ${label}`);
      }
    } catch (err) {
      console.error(`[Demo] Failed: ${label}`, err);
    } finally {
      setTimeout(() => setLoading(null), 1000);
    }
  };

  const resetSystem = async () => {
    setLoading('reset');
    try {
      await fetch(`${backendUrl}/clear-all`, { method: 'POST' });
    } finally {
      setTimeout(() => setLoading(null), 1000);
    }
  };
  const handleVoiceCommand = () => {
    if (onPlaySound) onPlaySound();
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';

    // Force Audio Hardware Wakeup
    if (window.globalAudioCtx && window.globalAudioCtx.state === 'suspended') {
      window.globalAudioCtx.resume();
    }

    recognition.start();
    setLoading('voice');

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      console.log("[Voice Command]", transcript);

      // Command: Mark Task Complete
      if (transcript.includes('complete') || transcript.includes('done')) {
        const pendingTask = tasks?.find(t => t.status !== 'completed' && t.status !== 'failed');
        if (pendingTask) {
          onUpdateTask(pendingTask.id, 'completed');
          return;
        }
      }

      // Command: Request Backup
      if (transcript.includes('backup') || transcript.includes('support')) {
        const activeInc = incidents?.find(i => i.status === 'active');
        if (activeInc) {
          onSimulateFailure('exit', { incident_id: activeInc.id });
          return;
        }
      }
      
      let detectedType = 'security';
      if (transcript.includes('fire') || transcript.includes('smoke')) detectedType = 'fire';
      else if (transcript.includes('medical') || transcript.includes('doctor')) detectedType = 'medical';

      let loc = location;
      const roomMatch = transcript.match(/room (\d+)/);
      if (roomMatch) loc = "Room " + roomMatch[1];
      const floorMatch = transcript.match(/floor (\d+)/);
      if (floorMatch) loc = "Floor " + floorMatch[1];
      
      setLocation(loc);

      try {
        await fetch(`${backendUrl}/incident`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            type: detectedType, 
            location: loc, 
            vip_present: transcript.includes('vip') 
          })
        });
      } catch(err) {
        console.error("Voice incident trigger failed", err);
      } finally {
        setTimeout(() => setLoading(null), 1000);
      }
    };

    recognition.onerror = () => setLoading(null);
    recognition.onend = () => setLoading(null);
  };


  const btnStyle = {
    padding: '12px 16px',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    fontFamily: 'Outfit, sans-serif',
    flex: 1,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  };

  return (
    <div style={{
      padding: '24px',
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      backdropFilter: 'blur(10px)',
    }}>
      <h3 style={{ margin: 0, fontSize: '16px', color: '#fff', fontWeight: 600 }}>
        {t ? t('Mission Control') : 'Mission Control'}
      </h3>
      
      <input 
        type="text" 
        value={location} 
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Incident Location (e.g. Room 302)"
        style={{
          background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
          color: '#fff', padding: '10px 14px', borderRadius: '10px', fontSize: '13px',
          outline: 'none', fontFamily: 'Outfit, sans-serif', width: '100%'
        }}
        title="Target location for the next scenario trigger"
      />
      
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={() => runScenario('fire', 'Fire Alarm')}
          disabled={loading === 'fire'}
          style={{
            ...btnStyle,
            background: 'linear-gradient(135deg, #ff2d55 0%, #ff375f 100%)',
            color: '#fff',
            opacity: loading === 'fire' ? 0.7 : 1,
            transform: loading === 'fire' ? 'scale(0.95)' : 'none',
          }}
        >
          {loading === 'fire' ? '🚀 TRIGGERING...' : '🚨 ' + (t ? t('SCENARIO: FIRE') : 'SCENARIO: FIRE')}
        </button>

        <button
          onClick={() => runScenario('medical', 'Medical Emergency')}
          disabled={loading === 'medical'}
          style={{
            ...btnStyle,
            background: 'linear-gradient(135deg, #ff9f0a 0%, #ffb340 100%)',
            color: '#fff',
            opacity: loading === 'medical' ? 0.7 : 1,
            transform: loading === 'medical' ? 'scale(0.95)' : 'none',
          }}
        >
          {loading === 'medical' ? '🚑 SENDING...' : '🚑 ' + (t ? t('SCENARIO: MEDICAL') : 'SCENARIO: MEDICAL')}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={() => runScenario('security', 'Disturbance')}
          disabled={loading === 'security'}
          style={{
            ...btnStyle,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff',
          }}
        >
          ⚠️ {t ? t('SECURITY THREAT') : 'SECURITY THREAT'}
        </button>

        <button
          onClick={() => runScenario('stress-test', 'Stress Test')}
          disabled={loading === 'stress-test'}
          style={{
            ...btnStyle,
            background: 'linear-gradient(135deg, #5e5ce6 0%, #7d7aff 100%)',
            color: '#fff',
            flex: 1.5,
          }}
        >
          {loading === 'stress-test' ? '🧪 SIMULATING...' : '🧪 ' + (t ? t('STRESS TEST') : 'STRESS TEST')}
        </button>

        <button
          onClick={resetSystem}
          disabled={loading === 'reset'}
          style={{
            ...btnStyle,
            background: 'rgba(255,255,255,0.05)',
            border: '1px dashed rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.6)',
            flex: 0.5,
          }}
        >
          {loading === 'reset' ? 'CLEANING...' : '🗑️'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={handleVoiceCommand}
          disabled={loading === 'voice'}
          style={{
            ...btnStyle,
            background: 'linear-gradient(135deg, #007aff 0%, #00c6ff 100%)',
            color: '#fff',
            justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(0, 122, 255, 0.3)',
            opacity: loading === 'voice' ? 0.7 : 1,
            marginTop: '8px',
            flex: 2
          }}
        >
          {loading === 'voice' ? '🎙️ LISTENING...' : '🎤 ' + (t ? t('VOICE COMMAND') : 'VOICE COMMAND')}
        </button>

        <button
          onClick={() => {
            const msg = t('Voice engine is operational and ready for deployment.');
            onAction?.('test-audio', msg);
          }}
          style={{
            ...btnStyle,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.6)',
            marginTop: '8px',
            flex: 0.8,
            justifyContent: 'center'
          }}
          title="Diagnostic: Test Audio Engine"
        >
          🔊 TEST
        </button>
      </div>
    </div>
  );
}
