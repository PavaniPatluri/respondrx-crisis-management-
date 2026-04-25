const playAlertSound = (type) => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    const playBeep = (freq, duration, volume = 0.1, delay = 0) => {
      setTimeout(() => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(volume, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
      }, delay * 1000);
    };

    if (type === 'fire') {
      // Rapid Siren Effect
      for(let i=0; i<6; i++) {
        playBeep(880 + (i*50), 0.2, 0.15, i * 0.15);
      }
    } else if (type === 'medical') {
      // Rhythmic Pulse Effect
      for(let i=0; i<3; i++) {
        playBeep(440, 0.4, 0.1, i * 0.6);
        playBeep(554, 0.4, 0.1, i * 0.6 + 0.3);
      }
    } else {
      // Standard notification
      playBeep(660, 0.3, 0.05);
    }
  } catch (e) {
    console.warn("AudioContext failed", e);
  }
};
