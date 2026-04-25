const AudioController = {
  queue: [],
  isProcessing: false,
  safetyGap: 600,
  activeUtterance: null, // Memory-lock for garbage collection
  watchdogTimer: null,
  voices: [],

  /**
   * Initialize hardware and load voices
   */
  init: function() {
    if (!window.speechSynthesis) return;
    
    const loadVoices = () => {
      this.voices = window.speechSynthesis.getVoices();
      console.log(`[AUDIO_CTRL] Hardware Initialized: ${this.voices.length} voices loaded.`);
    };

    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    loadVoices();
  },

  /**
   * Add an alert to the prioritized queue
   */
  play: function(text, lang, priority = 'normal') {
    if (!window.speechSynthesis) {
      console.warn("[AUDIO_CTRL] Speech API not supported.");
      return;
    }

    if (priority === 'critical') {
      console.log("[AUDIO_CTRL] CRITICAL INTERRUPT.");
      window.speechSynthesis.cancel();
      this.queue = [];
      this.isProcessing = false;
      if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
    }

    if (this.queue.some(item => item.text === text)) return;

    this.queue.push({ text, lang, priority });
    this.orchestrate();
  },

  /**
   * Orchestrate the sequential playback loop
   */
  orchestrate: function() {
    if (this.isProcessing || window.speechSynthesis.speaking || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const current = this.queue.shift();
    
    // Watchdog: Force-clear if playback hangs for >15s
    this.watchdogTimer = setTimeout(() => {
      if (this.isProcessing) {
        console.warn("[AUDIO_CTRL] Watchdog Triggered: Resetting stuck queue.");
        this.isProcessing = false;
        this.orchestrate();
      }
    }, 15000);

    const utterance = new SpeechSynthesisUtterance(current.text);
    this.activeUtterance = utterance; // Lock for GC

    // Voice Matching logic
    const voices = this.voices.length > 0 ? this.voices : window.speechSynthesis.getVoices();
    let selectedVoice = null;

    if (current.lang === 'te') {
      selectedVoice = voices.find(v => v.lang.startsWith('te') && (v.name.includes('Vani') || v.name.includes('Heera')));
      if (!selectedVoice) selectedVoice = voices.find(v => v.lang.startsWith('te'));
      utterance.pitch = 1.05; 
      utterance.rate = 0.85;  
      utterance.text = "దయచేసి గమనించండి... " + current.text; 
    } else if (current.lang === 'hi') {
      selectedVoice = voices.find(v => v.lang.startsWith('hi') || v.name.toLowerCase().includes('hindi'));
      utterance.pitch = 1.0;
      utterance.rate = 0.95;
      utterance.text = "एडमिन अलर्ट... " + current.text;
    } else {
      selectedVoice = voices.find(v => v.lang === 'en-IN' || v.name.includes('India'));
      utterance.pitch = 1.0;
      utterance.rate = 0.9;
    }

    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.lang = selectedVoice?.lang || (current.lang === 'te' ? 'te-IN' : current.lang === 'hi' ? 'hi-IN' : 'en-US');

    utterance.onstart = () => {
      console.log(`[AUDIO_CTRL] Playback Started (${current.lang}):`, current.text);
    };

    utterance.onend = () => {
      console.log("[AUDIO_CTRL] Broadcast Completed.");
      clearTimeout(this.watchdogTimer);
      this.isProcessing = false;
      this.activeUtterance = null;
      setTimeout(() => this.orchestrate(), this.safetyGap);
    };

    utterance.onerror = (e) => {
      console.error("[AUDIO_CTRL] Hardware Error:", e);
      clearTimeout(this.watchdogTimer);
      this.isProcessing = false;
      this.activeUtterance = null;
      this.orchestrate();
    };

    window.speechSynthesis.speak(utterance);
  }
};

AudioController.init();
export default AudioController;
