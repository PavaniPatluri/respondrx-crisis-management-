import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import './index.css';

const BACKEND_URL = 'http://localhost:5000';

const translate = (text, lang) => {
  if (!text || typeof text !== 'string' || lang === 'en') return text;
  
  const dict = {
    hi: {
      'Intelligence & Coordination': 'इंटेलिजेंस और समन्वय',
      'Live Situation Feed': 'लाइव स्थिति फ़ीड',
      'Tactical Spatial Awareness': 'सामरिक स्थानिक जागरूकता',
      'Decision Intelligence': 'निर्णय बुद्धि',
      'Forensic Timeline': 'फोरेंसिक टाइमलाइन',
      'Mission Control': 'मिशन कंट्रोल',
      'Alerts': 'अलर्ट',
      'Staff': 'कर्मचारी',
      'Impact': 'प्रभाव',
      'Active': 'सक्रिय',
      'Pending': 'लंबित',
      'Severity': 'गंभीरता',
      'Room': 'कमरा',
      'Floor': 'मंजिल',
      'Explain Why': 'कारण स्पष्ट करें',
      'Forensics': 'फोरेंसिक',
      'Acknowledge': 'स्वीकार करें',
      'Resolve': 'हल करें',
      'Logout': 'लॉग आउट',
      'Mission Control Access Restricted': 'मिशन कंट्रोल एक्सेस प्रतिबंधित',
      'VOICE COMMAND': 'ध्वनि आदेश',
      'FIRE': 'आग',
      'MEDICAL': 'चिकित्सा',
      'SECURITY': 'सुरक्षा',
      'CRITICAL': 'अति-गंभीर',
      'HIGH': 'उच्च',
      'MEDIUM': 'मध्यम',
      'LOW': 'कम',
      'Incident': 'घटना',
      'Safe': 'सुरक्षित',
      'Exit Path': 'निकास मार्ग',
      'RespondrX': 'रिस्पोंडर एक्स',
      'Smart Crisis Management': 'स्मार्ट संकट प्रबंधन'
    },
    te: {
      'Intelligence & Coordination': 'ఇంటెలిజెన్స్ & కోఆర్డినేషన్',
      'Live Situation Feed': 'లైవ్ సిట్యుయేషన్ ఫీడ్',
      'Tactical Spatial Awareness': 'టాక్టికల్ స్పేషియల్ అవేర్నెస్',
      'Decision Intelligence': 'డెసిషన్ ఇంటెలిజెన్స్',
      'Forensic Timeline': 'ఫోరెన్సిక్ టైంలైన్',
      'Mission Control': 'నియంత్రణ కేంద్రం',
      'Alerts': 'అలెర్ట్స్',
      'Staff': 'సిబ్బంది',
      'Impact': 'ప్రభావం',
      'Active': 'యాక్టివ్',
      'Pending': 'పెండింగ్',
      'Severity': 'తీవ్రత',
      'Room': 'గది',
      'Floor': 'అంతస్తు',
      'Explain Why': 'ఎందుకు వివరించండి',
      'Forensics': 'ఫోరెన్సిక్స్',
      'Acknowledge': 'అంగీకరించు',
      'Resolve': 'పరిష్కరించు',
      'Logout': 'లాగ్ అవుట్',
      'Mission Control Access Restricted': 'నియంత్రణ కేంద్రం పరిమితం చేయబడింది',
      'VOICE COMMAND': 'వాయిస్ కమాండ్',
      'FIRE': 'అగ్ని ప్రమాదం',
      'MEDICAL': 'వైద్య అత్యవసరం',
      'SECURITY': 'భద్రతా ముప్పు',
      'CRITICAL': 'అత్యంత అత్యవసరం',
      'HIGH': 'చాలా ఎక్కువ',
      'MEDIUM': 'మధ్యస్థం',
      'LOW': 'తక్కువ',
      'Incident': 'సమస్య',
      'Safe': 'సురక్షితం',
      'Exit Path': 'ఎగ్జిట్ పాత్',
      'RespondrX': 'రెస్పాండర్ ఎక్స్',
      'Smart Crisis Management': 'స్మార్ట్ క్రైసిస్ మేనేజ్మెంట్'
    }
  };

  let translated = text;
  Object.keys(dict[lang] || {}).forEach(k => {
    // Case-insensitive replacement to handle various backend message formats
    const regex = new RegExp(k, 'gi');
    translated = translated.replace(regex, dict[lang][k]);
  });
  return translated;
};

import AudioController from './AudioController';
import AdminAudioController from './admin_audio_controller';

// Global Persistent Audio Engine
let globalAudioCtx = null;

const playAlertSound = async (type) => {
  try {
    if (!globalAudioCtx) {
      globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      window.globalAudioCtx = globalAudioCtx; // Expose for other components
    }
    
    // Force Hardware Wakeup
    if (globalAudioCtx.state === 'suspended') {
      await globalAudioCtx.resume();
    }
    
    const playBeep = (freq, duration, volume = 0.2, delay = 0) => {
      setTimeout(() => {
        const osc = globalAudioCtx.createOscillator();
        const gain = globalAudioCtx.createGain();
        osc.connect(gain);
        gain.connect(globalAudioCtx.destination);
        osc.frequency.setValueAtTime(freq, globalAudioCtx.currentTime);
        gain.gain.setValueAtTime(volume, globalAudioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, globalAudioCtx.currentTime + duration);
        osc.start();
        osc.stop(globalAudioCtx.currentTime + duration);
      }, delay * 1000);
    };

    if (type === 'fire') {
      for(let i=0; i<6; i++) {
        playBeep(880 + (i*50), 0.2, 0.2, i * 0.15);
      }
    } else if (type === 'medical') {
      // Rhythmic Pulse Effect
      for(let i=0; i<3; i++) {
        playBeep(440, 0.4, 0.15, i * 0.6);
        playBeep(554, 0.4, 0.15, i * 0.6 + 0.3);
      }
    } else if (type === 'security') {
      // Sharp Double Pulse
      playBeep(220, 0.1, 0.2);
      playBeep(220, 0.1, 0.2, 0.15);
    } else {
      playBeep(660, 0.3, 0.1);
    }
  } catch (e) {
    console.warn("[AUDIO] Hardware engine failed to initialize:", e);
  }
};

export default function App() {
  const [incidents, setIncidents] = useState([]);
  const [staff, setStaff]         = useState([]);
  const [tasks, setTasks]         = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [toasts, setToasts]       = useState([]);
  const [connected, setConnected] = useState(false);
  const [user, setUser]           = useState(null);
  const [language, setLanguage]   = useState('en');
  const [audioArmed, setAudioArmed] = useState(false);
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState(new Set());
  
  const socketRef = useRef(null);
  const toastIdRef = useRef(0);

  // ── Audio Priming ───────────────────────────────────────────────────────
  useEffect(() => {
    const unlockAudio = () => {
      // Prime SpeechSynthesis
      if (window.speechSynthesis) {
        const prime = new SpeechSynthesisUtterance("");
        prime.volume = 0;
        window.speechSynthesis.speak(prime);
      }
      
      // Prime AudioContext
      if (!globalAudioCtx) {
        globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        window.globalAudioCtx = globalAudioCtx;
      }
      
      globalAudioCtx.resume().then(() => {
        setAudioArmed(true);
        console.log("[AUDIO] System armed via user interaction");
        window.removeEventListener('click', unlockAudio);
      });
    };
    window.addEventListener('click', unlockAudio);
    return () => window.removeEventListener('click', unlockAudio);
  }, []);


  // ── Auth Init ────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('nexus_token');
    if (token) {
      fetch(`${BACKEND_URL}/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Invalid token');
        })
        .then(data => setUser(data))
        .catch(() => localStorage.removeItem('nexus_token'));
    }
  }, []);

  // ── Translation helper ──────────────────────────────────────────────────
  const t = useCallback((text) => translate(text, language), [language]);

  // ── Toast helper ────────────────────────────────────────────────────────
  const addToast = useCallback((rawMessage, type = 'info', forceSoundType = null) => {
    // Intelligent Alert Prioritization: Suppress low priority noise
    if (type === 'low') {
      console.log("[Suppressed Alert]", rawMessage);
      return; 
    }

    const id = ++toastIdRef.current;
    
    // Play alert sound for new alerts
    if (type !== 'info' || forceSoundType) {
      playAlertSound(forceSoundType || type);
    }

    const message = translate(rawMessage, language);


    // Force 'fire' UI toasts to just look like 'critical'
    const displayType = type === 'fire' ? 'critical' : type;
    
    setToasts(prev => [...prev, { id, message, type: displayType }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, [language]);

  // ── Fetch helpers ────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    const fetchSafe = async (url) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return await res.json();
      } catch (e) {
        console.warn(`[FETCH] Failed for ${url}:`, e);
        return null;
      }
    };

    const [iData, sData, tData, aData] = await Promise.all([
      fetchSafe(`${BACKEND_URL}/incident`),
      fetchSafe(`${BACKEND_URL}/staff`),
      fetchSafe(`${BACKEND_URL}/tasks`),
      fetchSafe(`${BACKEND_URL}/analytics`),
    ]);

    if (iData) setIncidents(iData);
    if (sData) setStaff(sData);
    if (tData) setTasks(tData);
    if (aData) setAnalytics(aData);
  }, []);

  const refreshStaff = useCallback(async () => {
    const res = await fetch(`${BACKEND_URL}/staff`);
    setStaff(await res.json());
  }, []);

  const refreshTasks = useCallback(async () => {
    const res = await fetch(`${BACKEND_URL}/tasks`);
    setTasks(await res.json());
  }, []);

  const refreshIncidents = useCallback(async () => {
    const res = await fetch(`${BACKEND_URL}/incident`);
    setIncidents(await res.json());
  }, []);

  const refreshAnalytics = useCallback(async () => {
    const res = await fetch(`${BACKEND_URL}/analytics`);
    setAnalytics(await res.json());
  }, []);

  // ── WebSocket Setup ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return; // Only connect if authenticated

    fetchAll();

    const socket = io(BACKEND_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      console.log('[WS] Connected');
      socket.emit('join', { role: user.role });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // New incident created
    socket.on('new_incident', (data) => {
      const sev = data.incident?.severity ?? 'info';
      const isFire = data.incident?.type === 'fire';
      const isMedical = data.incident?.type === 'medical';
      
      let soundType = null;
      let uiType = sev === 'critical' ? 'critical' : sev === 'high' ? 'high' : 'info';
      
      if (isFire) {
         soundType = 'fire';
         uiType = 'critical'; 
      } else if (isMedical) {
         soundType = 'medical';
      }

      // Location-Aware Alerts constraint
      if (user?.role === 'staff') {
         // simplified logic: if we are staff and it's not our floor, downgrade priority
         const userFloorStr = String(user?.current_floor || '1');
         const incFloorStr = String(data.incident?.floor || '1');
         if (userFloorStr !== incFloorStr) {
            uiType = 'low'; // will be suppressed by addToast prioritization
         }
      }

      addToast(
        data.message, 
        uiType, 
        soundType
      );

      refreshIncidents();
    });

    // Task auto-assigned
    socket.on('task_assigned', (data) => {
      addToast(data.message, 'info');
      
      // Voice alert for assigned staff
      const task = data.task;
      
      refreshTasks();
      refreshStaff();
    });

    // Task status updated
    socket.on('task_updated', (data) => {
      addToast(data.message, data.task?.status === 'completed' ? 'success' : 'info');
      
      // Voice confirmation for completion
      if (data.task?.status === 'completed' && data.task?.staff_name === user?.username) {
         // Speech removed
      }

      setTasks(prev => prev.map(t => t.id === data.task.id ? data.task : t));
      refreshStaff();
    });

    // Incident resolved
    socket.on('incident_resolved', (data) => {
      addToast(data.message, 'success');
      refreshIncidents();
      refreshAnalytics();
    });

    // IoT sensor alert
    socket.on('iot_alert', (data) => {
      addToast(data.message, 'high');
    });

    // Staff reset
    socket.on('staff_reset', () => {
      refreshStaff();
    });

    // All data cleared
    socket.on('data_cleared', (data) => {
      addToast(data.message, 'info');
      // Force re-fetch everything from the now-empty DB
      fetchAll();
    });

    // Failure injected
    socket.on('failure_triggered', (data) => {
      addToast(data.message, 'critical');
    });

    // Escalation triggered
    socket.on('escalation_triggered', (data) => {
      addToast(data.message, 'critical');
    });

    // Reassignment triggered
    socket.on('reassignment_triggered', (data) => {
      addToast(data.message, 'high');
      refreshTasks();
      refreshStaff();
    });

    // Decision explained
    socket.on('decision_explained', (data) => {
      addToast(data.message, 'info');
      refreshIncidents();
    });

    // Replay started
    socket.on('replay_started', (data) => {
      addToast(data.message, 'info');
    });

    // Stress test triggered
    socket.on('stress_test_triggered', (data) => {
      addToast(data.message, 'critical');
    });

    // Time-to-Critical updated
    socket.on('time_to_critical_updated', (data) => {
      setIncidents(prev => prev.map(inc => 
        inc.id === data.incident_id ? { ...inc, time_to_critical: data.time_left } : inc
      ));
    });

    // Evacuation Path updated
    socket.on('evacuation_path_updated', (data) => {
      addToast(data.message, 'info');
      setIncidents(prev => prev.map(inc => 
        inc.id === data.incident_id ? { ...inc, evacuation_path: data.path.map(p => `${p.floor},${p.room}`) } : inc
      ));
    });

    socket.on("broadcast_voice_alert", (data) => {
      console.log("[Audio Broadcast]", data);
      
      const isStaff = user?.role === 'staff';
      const targetRole = isStaff ? 'staff' : 'admin';
      
      if (data.role === targetRole) {
        const msg = translate(data.message, language);
        const priority = data.message.toLowerCase().includes('fire') || data.message.toLowerCase().includes('emergency') ? 'critical' : 'normal';
        
        const controller = data.role === 'admin' ? AdminAudioController : AudioController;
        controller.play(msg, language, priority);
        
        // Repetition logic: If not acknowledged in 15s, repeat once
        setTimeout(() => {
          setAcknowledgedAlerts(prev => {
            if (!prev.has(data.incident_id)) {
               console.log("[Repetition] Alert not acknowledged. Re-queuing.");
               controller.play(msg, language, 'normal');
            }
            return prev;
          });
        }, 15000);
      }
    });

    // Impact Score calculated
    socket.on('impact_score_calculated', (data) => {
      setIncidents(prev => prev.map(inc => 
        inc.id === data.incident_id ? { ...inc, impact_score: data.score } : inc
      ));
    });


    return () => socket.disconnect();
  }, [user, fetchAll, addToast, refreshIncidents, refreshTasks, refreshStaff, refreshAnalytics]);

  // ── API Actions ──────────────────────────────────────────────────────────
  const triggerIncident = useCallback(async (type, location, vip_present = false) => {
    await fetch(`${BACKEND_URL}/incident`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, location, vip_present }),
    });
  }, []);

  const runDemo = useCallback(async (scenario) => {
    await fetch(`${BACKEND_URL}/demo/${scenario}`, { method: 'POST' });
  }, []);

  const updateTask = useCallback(async (taskId, status) => {
    await fetch(`${BACKEND_URL}/task/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  }, []);

  const resolveIncident = useCallback(async (incidentId) => {
    await fetch(`${BACKEND_URL}/incident/${incidentId}/resolve`, { method: 'POST' });
  }, []);

  const resetStaff = useCallback(async () => {
    await fetch(`${BACKEND_URL}/staff/reset`, { method: 'POST' });
  }, []);

  const clearAll = useCallback(async () => {
    await fetch(`${BACKEND_URL}/clear-all`, { method: 'POST' });
    // Immediately re-fetch all data (fallback if WS event is slow)
    fetchAll();
  }, [fetchAll]);

  const simulateIoT = useCallback(async (sensor, value, location) => {
    await fetch(`${BACKEND_URL}/iot/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sensor, value, location }),
    });
  }, []);

  const simulateFailure = useCallback(async (type, payload = {}) => {
    if (type === 'staff') {
      await fetch(`${BACKEND_URL}/demo/fail-staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else if (type === 'exit') {
      await fetch(`${BACKEND_URL}/demo/exit-blocked`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else if (type === 'delay') {
      await fetch(`${BACKEND_URL}/demo/delay-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
  }, []);



  return (
    <>
      {!user ? (
        <Login onLoginComplete={setUser} />
      ) : (
        <Dashboard
          user={user}
          incidents={incidents}
          staff={staff}
          tasks={tasks}
          analytics={analytics}
          connected={connected}
          audioArmed={audioArmed}
          onTestBeep={() => playAlertSound('test')}
          onPlayAlertSound={playAlertSound}
          onPlayVoice={(text, lang, priority) => {
             const controller = user?.role === 'admin' ? AdminAudioController : AudioController;
             controller.play(text, lang, priority);
          }}
          onAcknowledgeAlert={(id) => setAcknowledgedAlerts(prev => new Set([...prev, id]))}
          onTriggerIncident={triggerIncident}
          onRunDemo={runDemo}
          onUpdateTask={updateTask}
          onResolveIncident={resolveIncident}
          onResetStaff={resetStaff}
          onClearAll={clearAll}
          onSimulateIoT={simulateIoT}
          onSimulateFailure={simulateFailure}
          toasts={toasts}
          language={language}
          setLanguage={setLanguage}
          t={t}
          backendUrl={BACKEND_URL}
          onLogout={() => {
            localStorage.removeItem('nexus_token');
            setUser(null);
            if (socketRef.current) socketRef.current.disconnect();
          }}
        />
      )}
    </>
  );
}
