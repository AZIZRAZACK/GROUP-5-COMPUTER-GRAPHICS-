export class SoundFX {
  constructor() {
    this.ctx = null;
    this.musicTimer = null;
    this.isMusicPlaying = false;
    this.stepIndex = 0;

    // Simple retro melody notes in Hz (0 = pause/rest)
    this.melody = [
      261.63, 329.63, 392.00, 523.25,
      392.00, 329.63, 293.66, 349.23,
      440.00, 587.33, 440.00, 349.23,
      392.00, 0,      392.00, 0
    ];

    // Automatically start background music on the user's first key press or click
    const unlockAndStart = () => {
      this.startMusic();
      if (this.isMusicPlaying) {
        window.removeEventListener("keydown", unlockAndStart);
        window.removeEventListener("pointerdown", unlockAndStart);
      }
    };

    window.addEventListener("keydown", unlockAndStart);
    window.addEventListener("pointerdown", unlockAndStart);
  }

  ensureCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  startMusic() {
    this.ensureCtx();
    if (!this.ctx || this.isMusicPlaying) return;

    this.isMusicPlaying = true;
    this.stepIndex = 0;

    const playNextNote = () => {
      if (!this.isMusicPlaying) return;

      const freq = this.melody[this.stepIndex % this.melody.length];
      if (freq > 0) {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now);

        // Kept quiet (0.03) so it doesn't overpower jump/trap sound effects
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.18);
      }

      this.stepIndex++;
      this.musicTimer = setTimeout(playNextNote, 220);
    };

    playNextNote();
  }

  stopMusic() {
    this.isMusicPlaying = false;
    clearTimeout(this.musicTimer);
    this.musicTimer = null;
  }

  play(type) {
    this.ensureCtx();
    if (!this.ctx) return;

    // Also start music if a sound effect triggers first
    if (!this.isMusicPlaying) {
      this.startMusic();
    }

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    if (type === "jump") {
      osc.type = "square";
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.1);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === "trap") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(95, now + 0.14);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.start(now);
      osc.stop(now + 0.14);
    } else if (type === "death") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.28);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
    } else if (type === "win") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(587.33, now + 0.08);
      osc.frequency.setValueAtTime(880, now + 0.16);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  }
}
