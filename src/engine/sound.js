export class SoundFX {
  constructor() {
    this.ctx = null;
  }

  ensureCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  play(type) {
    this.ensureCtx();
    if (!this.ctx) return;

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

export const MUSIC_TRACKS = [
  { src: "assets/Supa.mp3", name: "Balloteli Supa" },
  { src: "assets/SoundofSalem.mp3", name: "Song 2" }
];

export class BackgroundMusic {
  constructor(tracks = MUSIC_TRACKS) {
    this.tracks = tracks;
    this.audio = null;
    this.trackIndex = -1;
    this.failedTracks = new Set();
    this.trackAttempt = 0;
    this.noticeText = "";
    this.noticeUntil = 0;
    this.started = false;
    this.runActive = false;
    this.muted = localStorage.getItem("troll_music_muted") === "true";
  }

  startRun(fromBeginning = false, advance = false) {
    this.started = true;
    this.runActive = true;

    if (advance || this.trackIndex < 0) {
      const startIndex = advance && this.trackIndex >= 0
        ? (this.trackIndex + 1) % this.tracks.length
        : 0;
      this.selectTrack(startIndex, fromBeginning);
      return;
    }

    if (fromBeginning && this.audio) this.rewind(this.audio);
    this.syncPlayback();
  }

  pauseRun() {
    this.runActive = false;
    this.audio?.pause();
  }

  nextTrack() {
    if (this.tracks.length === 0) return;

    const nextIndex = this.trackIndex < 0
      ? 0
      : (this.trackIndex + 1) % this.tracks.length;
    this.selectTrack(nextIndex, true);
  }

  selectTrack(startIndex, fromBeginning) {
    if (this.tracks.length === 0 || typeof Audio !== "function") return;

    this.audio?.pause();
    this.audio = null;
    this.noticeText = "";
    this.noticeUntil = 0;
    const attempt = ++this.trackAttempt;
    this.tryTrack(startIndex, fromBeginning, attempt, 0);
  }

  tryTrack(index, fromBeginning, attempt, checked) {
    if (attempt !== this.trackAttempt || checked >= this.tracks.length) return;

    const trackIndex = index % this.tracks.length;
    if (this.failedTracks.has(trackIndex)) {
      this.tryTrack(trackIndex + 1, fromBeginning, attempt, checked + 1);
      return;
    }

    const track = this.tracks[trackIndex];
    const audio = new Audio(track.src);
    this.trackIndex = trackIndex;
    this.audio = audio;
    audio.loop = true;
    audio.volume = 0.25;
    audio.muted = this.muted;
    audio.preload = "auto";

    let notified = false;
    const notifyStarted = () => {
      if (notified || this.audio !== audio) return;
      notified = true;
      this.noticeText = `Now playing: ${track.name}`;
      this.noticeUntil = performance.now() + 2000;
    };

    const failTrack = () => {
      if (this.audio !== audio || this.failedTracks.has(trackIndex)) return;
      this.failedTracks.add(trackIndex);
      audio.pause();
      if (this.runActive) {
        this.tryTrack(trackIndex + 1, true, attempt, checked + 1);
      }
    };

    audio.addEventListener("playing", notifyStarted);
    audio.addEventListener("error", failTrack);
    if (fromBeginning) this.rewind(audio);
    audio.load();
    this.syncPlayback();
  }

  syncPlayback() {
    if (!this.audio) return;
    if (this.muted || document.hidden || !this.runActive) {
      this.audio.pause();
      return;
    }
    const audio = this.audio;
    const trackIndex = this.trackIndex;
    const attempt = this.trackAttempt;
    audio.play().catch((error) => {
      if (this.audio !== audio || this.trackAttempt !== attempt) return;
      if (error?.name === "NotAllowedError" || error?.name === "AbortError") return;
      if (trackIndex >= 0 && !this.failedTracks.has(trackIndex)) {
        this.failedTracks.add(trackIndex);
        this.tryTrack(trackIndex + 1, true, attempt, 1);
      }
    });
  }

  rewind(audio) {
    try {
      audio.currentTime = 0;
    } catch {
      audio.addEventListener("loadedmetadata", () => {
        if (this.audio === audio) audio.currentTime = 0;
      }, { once: true });
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.audio) this.audio.muted = this.muted;
    localStorage.setItem("troll_music_muted", String(this.muted));
    this.syncPlayback();
    return this.muted;
  }

  getTrackNotice() {
    return performance.now() < this.noticeUntil ? this.noticeText : "";
  }

  onVisibilityChange() {
    this.syncPlayback();
  }
}
