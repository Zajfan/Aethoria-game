export class AudioSystem {
  constructor() {
    this._ctx    = null;
    this._master = null;
    this._enabled = localStorage.getItem('aethoria_mute') !== '1';
    this._ambience = null;
    this._windTimer = null;
  }

  init() {
    try {
      this._ctx    = new (window.AudioContext || window.webkitAudioContext)();
      this._master = this._ctx.createGain();
      this._master.gain.value = 0.28;
      this._master.connect(this._ctx.destination);
      return true;
    } catch (_) { return false; }
  }

  _resume() {
    if (this._ctx?.state === 'suspended') this._ctx.resume().catch(() => {});
  }

  _tone(freq, type, dur, vol, delay = 0, pitchEnd = null) {
    if (!this._enabled || !this._ctx) return;
    this._resume();
    const now = this._ctx.currentTime + delay;
    const osc = this._ctx.createOscillator();
    const g   = this._ctx.createGain();
    osc.connect(g); g.connect(this._master);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (pitchEnd) osc.frequency.linearRampToValueAtTime(pitchEnd, now + dur);
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.start(now);
    osc.stop(now + dur + 0.01);
  }

  /* ── SFX ──────────────────────────────────────────────── */
  sfxHit()      { this._tone(200, 'square', 0.07, 0.35); this._tone(140, 'square', 0.05, 0.2, 0.04); }
  sfxPlayerHit(){ this._tone(110, 'sawtooth', 0.18, 0.45); this._tone(80, 'sine', 0.12, 0.3, 0.06); }
  sfxKill()     { [380, 480, 600].forEach((f,i) => this._tone(f, 'square', 0.09, 0.25, i*0.045)); }
  sfxLevelUp()  { [523,659,784,1047].forEach((f,i) => this._tone(f, 'sine', 0.28, 0.38, i*0.11)); }
  sfxPickup()   { this._tone(880, 'sine', 0.09, 0.28); this._tone(1100, 'sine', 0.07, 0.2, 0.08); }
  sfxUIOpen()   { this._tone(660, 'sine', 0.07, 0.18); }
  sfxUIClose()  { this._tone(440, 'sine', 0.07, 0.14); }
  sfxQuestGet() { [523,659,784].forEach((f,i) => this._tone(f, 'sine', 0.18, 0.28, i*0.09)); }
  sfxAchieve()  { [880,1100,1320,1760].forEach((f,i) => this._tone(f, 'sine', 0.25, 0.4, i*0.08)); }
  sfxBossDeath(){ [220,330,440,110].forEach((f,i) => this._tone(f, 'sawtooth', 0.35, 0.5, i*0.12)); }
  sfxPortal()   { for(let i=0;i<6;i++) this._tone(200+i*80, 'sine', 0.15, 0.2, i*0.05); }
  sfxBuy()      { this._tone(600,'sine',0.08,0.3); this._tone(750,'sine',0.06,0.2,0.07); }
  sfxSell()     { this._tone(400,'sine',0.08,0.25); }

  sfxStep() {
    if (!this._enabled || !this._ctx) return;
    this._resume();
    const now = this._ctx.currentTime;
    const buf  = this._ctx.createBuffer(1, this._ctx.sampleRate * 0.04, this._ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src  = this._ctx.createBufferSource();
    const g    = this._ctx.createGain();
    src.buffer = buf;
    src.connect(g); g.connect(this._master);
    g.gain.value = 0.04;
    src.start(now);
  }

  sfxWorldEvent() {
    this._tone(120, 'sawtooth', 0.5, 0.4);
    [200,160,120,80].forEach((f,i) => this._tone(f, 'square', 0.3, 0.25, 0.1 + i*0.12));
  }

  /* ── Ambience ─────────────────────────────────────────── */
  startAmbience(type = 'day') {
    this._stopAmbience();
    if (!this._enabled || !this._ctx) return;
    this._resume();

    const drone = this._ctx.createOscillator();
    const g     = this._ctx.createGain();
    drone.connect(g); g.connect(this._master);
    drone.type = 'sine';
    drone.frequency.value = type === 'night' ? 65 : 100;
    g.gain.value = 0.035;
    drone.start();

    const drone2 = this._ctx.createOscillator();
    const g2     = this._ctx.createGain();
    drone2.connect(g2); g2.connect(this._master);
    drone2.type = 'sine';
    drone2.frequency.value = (type === 'night' ? 65 : 100) * 1.5;
    g2.gain.value = 0.018;
    drone2.start();

    this._ambience = { osc: [drone, drone2], gains: [g, g2] };

    if (type === 'day') this._scheduleWind();
    if (type === 'storm') this._scheduleStorm();
  }

  _scheduleWind() {
    if (!this._enabled || !this._ctx) return;
    const delay = Math.random() * 7000 + 3000;
    this._windTimer = setTimeout(() => {
      if (!this._ctx) return;
      this._resume();
      const dur = 0.8 + Math.random() * 0.8;
      const f   = 180 + Math.random() * 120;
      const osc = this._ctx.createOscillator();
      const g   = this._ctx.createGain();
      osc.connect(g); g.connect(this._master);
      osc.type = 'sawtooth'; osc.frequency.value = f;
      const t = this._ctx.currentTime;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.04, t + dur * 0.3);
      g.gain.linearRampToValueAtTime(0, t + dur);
      osc.start(t); osc.stop(t + dur + 0.05);
      this._scheduleWind();
    }, delay);
  }

  _scheduleStorm() {
    if (!this._enabled || !this._ctx) return;
    this._windTimer = setInterval(() => {
      if (!this._ctx) return;
      this._resume();
      this._tone(60 + Math.random()*40, 'sawtooth', 0.15 + Math.random()*0.2, 0.06);
    }, 600);
  }

  _stopAmbience() {
    clearTimeout(this._windTimer);
    clearInterval(this._windTimer);
    if (this._ambience) {
      this._ambience.osc.forEach(o => { try { o.stop(); } catch(_) {} });
      this._ambience = null;
    }
  }

  setEnabled(v) {
    this._enabled = v;
    if (v) { localStorage.removeItem('aethoria_mute'); }
    else   { localStorage.setItem('aethoria_mute', '1'); this._stopAmbience(); }
    if (this._master) this._master.gain.value = v ? 0.28 : 0;
  }

  toggle() { this.setEnabled(!this._enabled); return this._enabled; }
  isEnabled() { return this._enabled; }
}
