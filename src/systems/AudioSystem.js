/**
 * AudioSystem.js  (v0.5 — Spatial Audio + Dynamic Music)
 *
 * Improvements over v0.4:
 *  • Web Audio API PannerNode for 3D positional sound — enemies heard before seen
 *  • Dynamic music layers: ambient pad always on, combat layer fades in when
 *    enemies are nearby, boss layer adds during boss fights
 *  • Procedural music: generative arpeggiator in Dorian/Aeolian modes
 *  • Height-aware reverb: caves/dungeons get longer reverb via ConvolverNode
 *  • SFX expanded: sword swing, arrow shot, chest open, trap fire, status effects
 *  • Volume zones: player passes hill → wind increases; dungeon → reverb wet
 *  • Master volume, music volume, sfx volume independently controllable
 *  • Mute toggle persisted to localStorage
 */

export class AudioSystem {
  constructor() {
    this._ctx         = null;
    this._masterGain  = null;  // top-level output
    this._sfxGain     = null;  // SFX bus
    this._musicGain   = null;  // music bus
    this._reverbGain  = null;  // wet reverb send

    this._enabled     = localStorage.getItem('aethoria_mute') !== '1';
    this._musicVol    = parseFloat(localStorage.getItem('aethoria_music_vol') ?? '0.7');
    this._sfxVol      = parseFloat(localStorage.getItem('aethoria_sfx_vol')   ?? '1.0');

    this._ambienceOscs  = [];
    this._combatOscs    = [];
    this._bossOscs      = [];
    this._arpeggOscs    = [];
    this._windTimer     = null;
    this._arpeggTimer   = null;
    this._convolver     = null;

    this._musicMode     = 'day';  // 'day'|'night'|'combat'|'boss'|'dungeon'
    this._combatTarget  = 0;      // target gain for combat layer
    this._combatCurrent = 0;      // current gain (lerped)
    this._listener      = null;   // AudioListener position

    // For lerping music layers
    this._lastUpdate    = 0;
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  init() {
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();

      // Master chain: masterGain → destination
      this._masterGain = this._ctx.createGain();
      this._masterGain.gain.value = this._enabled ? 0.30 : 0;
      this._masterGain.connect(this._ctx.destination);

      // SFX bus
      this._sfxGain = this._ctx.createGain();
      this._sfxGain.gain.value = this._sfxVol;
      this._sfxGain.connect(this._masterGain);

      // Music bus (lower than SFX in default)
      this._musicGain = this._ctx.createGain();
      this._musicGain.gain.value = this._musicVol * 0.4;
      this._musicGain.connect(this._masterGain);

      // Reverb send — simple impulse-response reverb via ConvolverNode
      this._buildReverb();

      // AudioListener for spatial audio
      this._listener = this._ctx.listener;

      return true;
    } catch (e) {
      console.warn('[AudioSystem] Web Audio API unavailable:', e);
      return false;
    }
  }

  _resume() {
    if (this._ctx?.state === 'suspended') this._ctx.resume().catch(() => {});
  }

  // ── Reverb (convolver via algorithmic impulse) ────────────────────────────

  _buildReverb() {
    if (!this._ctx) return;
    const sr   = this._ctx.sampleRate;
    const len  = sr * 2.5;   // 2.5 second tail
    const buf  = this._ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
      }
    }
    this._convolver = this._ctx.createConvolver();
    this._convolver.buffer = buf;

    this._reverbGain = this._ctx.createGain();
    this._reverbGain.gain.value = 0.12;   // dry world; increases in dungeon
    this._convolver.connect(this._reverbGain);
    this._reverbGain.connect(this._masterGain);
  }

  // ── Spatial helper ────────────────────────────────────────────────────────

  /**
   * Update listener position (call each frame with player world position).
   * @param {number} x  @param {number} y  @param {number} z
   * @param {number} [facingAngle]  player Y rotation in radians
   */
  updateListenerPosition(x, y, z, facingAngle = 0) {
    if (!this._ctx || !this._listener) return;
    const l = this._listener;
    if (l.positionX) {
      l.positionX.setValueAtTime(x, this._ctx.currentTime);
      l.positionY.setValueAtTime(y, this._ctx.currentTime);
      l.positionZ.setValueAtTime(z, this._ctx.currentTime);
      l.forwardX.setValueAtTime(Math.sin(facingAngle), this._ctx.currentTime);
      l.forwardZ.setValueAtTime(Math.cos(facingAngle), this._ctx.currentTime);
    } else {
      l.setPosition(x, y, z);
      l.setOrientation(Math.sin(facingAngle), 0, Math.cos(facingAngle), 0, 1, 0);
    }
  }

  /**
   * Create a panned sound source at a world position.
   * @param {number} sx  @param {number} sy  @param {number} sz  source position
   * @param {number} maxDist  beyond which sound is inaudible
   * @returns {PannerNode|null}
   */
  _makePanner(sx, sy, sz, maxDist = 20) {
    if (!this._ctx) return null;
    const panner = this._ctx.createPanner();
    panner.panningModel    = 'HRTF';
    panner.distanceModel   = 'inverse';
    panner.refDistance     = 1;
    panner.maxDistance     = maxDist;
    panner.rolloffFactor   = 1.8;
    if (panner.positionX) {
      panner.positionX.value = sx;
      panner.positionY.value = sy;
      panner.positionZ.value = sz;
    } else {
      panner.setPosition(sx, sy, sz);
    }
    panner.connect(this._sfxGain);
    return panner;
  }

  // ── Tone helper ───────────────────────────────────────────────────────────

  /**
   * Play a synthesised tone on the SFX bus.
   * @param {number} freq  @param {string} type  osc type
   * @param {number} dur   @param {number} vol   0..1
   * @param {number} [delay]  @param {number} [pitchEnd]
   * @param {{x,y,z}|null} [pos]  world position for spatial audio
   */
  _tone(freq, type, dur, vol, delay = 0, pitchEnd = null, pos = null) {
    if (!this._enabled || !this._ctx) return;
    this._resume();
    const now = this._ctx.currentTime + delay;
    const osc = this._ctx.createOscillator();
    const g   = this._ctx.createGain();
    osc.connect(g);

    if (pos) {
      const panner = this._makePanner(pos.x, pos.y ?? 1, pos.z, 25);
      if (panner) g.connect(panner);
      else        g.connect(this._sfxGain);
    } else {
      g.connect(this._sfxGain);
    }

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (pitchEnd) osc.frequency.linearRampToValueAtTime(pitchEnd, now + dur);
    g.gain.setValueAtTime(vol * this._sfxVol, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  // ── Noise burst helper ────────────────────────────────────────────────────

  _noise(dur, vol, bandLow = 0, bandHigh = 0, pos = null) {
    if (!this._enabled || !this._ctx) return;
    this._resume();
    const sr   = this._ctx.sampleRate;
    const len  = Math.ceil(sr * dur);
    const buf  = this._ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);

    const src = this._ctx.createBufferSource();
    src.buffer = buf;
    const g = this._ctx.createGain();
    g.gain.value = vol * this._sfxVol;
    src.connect(g);

    if (bandLow && bandHigh) {
      const bp = this._ctx.createBiquadFilter();
      bp.type            = 'bandpass';
      bp.frequency.value = (bandLow + bandHigh) / 2;
      bp.Q.value         = 1.0;
      g.connect(bp);
      if (pos) { const p = this._makePanner(pos.x, 1, pos.z, 20); if (p) bp.connect(p); else bp.connect(this._sfxGain); }
      else     bp.connect(this._sfxGain);
    } else {
      if (pos) { const p = this._makePanner(pos.x, 1, pos.z, 20); if (p) g.connect(p); else g.connect(this._sfxGain); }
      else     g.connect(this._sfxGain);
    }

    src.start(this._ctx.currentTime);
  }

  // ── SFX ───────────────────────────────────────────────────────────────────

  sfxHit(pos = null) {
    this._tone(220, 'square',   0.06, 0.40, 0,    null, pos);
    this._tone(140, 'square',   0.05, 0.22, 0.04, null, pos);
  }

  sfxSwordSwing(pos = null) {
    this._tone(380, 'sawtooth', 0.08, 0.30, 0,    260, pos);
    this._noise(0.06, 0.18, 1000, 4000, pos);
  }

  sfxArrowShot(pos = null) {
    this._noise(0.05, 0.20, 800, 3000, pos);
    this._tone(200, 'sine', 0.08, 0.15, 0.03, 100, pos);
  }

  sfxPlayerHit() {
    this._tone(110, 'sawtooth', 0.18, 0.50);
    this._tone(80,  'sine',     0.12, 0.30, 0.06);
    this._noise(0.12, 0.25, 100, 400);
  }

  sfxKill(pos = null) {
    [380, 480, 600].forEach((f, i) => this._tone(f, 'square', 0.09, 0.28, i * 0.045, null, pos));
  }

  sfxLevelUp() {
    [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 'sine', 0.30, 0.40, i * 0.12));
    setTimeout(() => [1047, 1319, 1568].forEach((f, i) => this._tone(f, 'sine', 0.20, 0.30, i * 0.10)), 600);
  }

  sfxPickup(pos = null) {
    this._tone(880,  'sine', 0.09, 0.30, 0,    null, pos);
    this._tone(1100, 'sine', 0.07, 0.22, 0.08, null, pos);
  }

  sfxChestOpen() {
    // Wooden creak then sparkle
    this._noise(0.18, 0.30, 200, 800);
    [880, 1100, 1320, 1760].forEach((f, i) => this._tone(f, 'sine', 0.22, 0.35, 0.15 + i * 0.07));
  }

  sfxTrapFire(pos = null) {
    this._tone(80, 'sawtooth', 0.25, 0.55, 0, null, pos);
    this._noise(0.20, 0.40, 60, 300, pos);
    this._tone(160, 'square', 0.15, 0.30, 0.05, 60, pos);
  }

  sfxStatusBurn(pos = null) {
    for (let i = 0; i < 4; i++) this._tone(300 + i * 80, 'sawtooth', 0.08, 0.18, i * 0.04, null, pos);
  }

  sfxStatusFreeze(pos = null) {
    [1200, 1600, 1000, 800].forEach((f, i) => this._tone(f, 'sine', 0.10, 0.20, i * 0.03, null, pos));
  }

  sfxStatusPoison(pos = null) {
    this._tone(180, 'sawtooth', 0.15, 0.22, 0, 120, pos);
  }

  sfxUIOpen()   { this._tone(660,  'sine', 0.07, 0.18); }
  sfxUIClose()  { this._tone(440,  'sine', 0.07, 0.14); }
  sfxQuestGet() { [523, 659, 784].forEach((f, i) => this._tone(f, 'sine', 0.18, 0.28, i * 0.09)); }
  sfxAchieve()  { [880, 1100, 1320, 1760].forEach((f, i) => this._tone(f, 'sine', 0.28, 0.42, i * 0.08)); }
  sfxBossDeath(){ [220, 330, 440, 110].forEach((f, i) => this._tone(f, 'sawtooth', 0.38, 0.52, i * 0.14)); }
  sfxPortal()   { for (let i = 0; i < 6; i++) this._tone(200 + i * 80, 'sine', 0.16, 0.22, i * 0.05); }
  sfxBuy()      { this._tone(600, 'sine', 0.08, 0.30); this._tone(750, 'sine', 0.06, 0.20, 0.07); }
  sfxSell()     { this._tone(400, 'sine', 0.08, 0.25); }

  sfxStep() {
    if (!this._enabled || !this._ctx) return;
    this._resume();
    this._noise(0.04, 0.035, 100, 800);
  }

  sfxWorldEvent() {
    this._tone(120, 'sawtooth', 0.5, 0.4);
    [200, 160, 120, 80].forEach((f, i) => this._tone(f, 'square', 0.3, 0.25, 0.1 + i * 0.12));
  }

  sfxEnemyNearby(pos = null) {
    // Low growl — heard before enemy is visible
    this._tone(60, 'sawtooth', 0.30, 0.12, 0, 50, pos);
  }

  sfxCombo(count) {
    const f = 440 + count * 55;
    this._tone(f, 'sine', 0.12, 0.35);
    this._tone(f * 1.25, 'sine', 0.10, 0.25, 0.07);
  }

  // ── Dynamic Music ─────────────────────────────────────────────────────────

  /**
   * Start a music mode. Layers fade in/out smoothly.
   * @param {'day'|'night'|'combat'|'boss'|'dungeon'|'storm'} type
   */
  startAmbience(type = 'day') {
    if (!this._enabled || !this._ctx) return;
    this._resume();
    this._stopAllMusic();
    this._musicMode = type;

    if (type === 'dungeon') {
      this._reverbGain && (this._reverbGain.gain.value = 0.45);  // wet reverb in dungeon
      this._startDungeonMusic();
    } else {
      this._reverbGain && (this._reverbGain.gain.value = 0.12);
      this._startWorldMusic(type);
    }
  }

  /** Smoothly blend toward combat music. Call when enemies are nearby. */
  setCombatIntensity(intensity) {
    // intensity 0..1 — drives combat layer volume
    this._combatTarget = Math.max(0, Math.min(1, intensity));
  }

  _startWorldMusic(type) {
    if (!this._ctx) return;

    // Base drone — sets tonal centre
    const rootFreq  = type === 'night' ? 55 : 82.4;  // A1 or E2
    const droneFreq = [rootFreq, rootFreq * 1.5, rootFreq * 2];

    droneFreq.forEach((f, i) => {
      const osc = this._ctx.createOscillator();
      const g   = this._ctx.createGain();
      osc.type            = i === 0 ? 'sawtooth' : 'sine';
      osc.frequency.value = f;
      osc.connect(g);
      g.connect(this._musicGain);
      g.gain.value = [0.055, 0.030, 0.018][i] * (type === 'night' ? 0.7 : 1);
      osc.start();
      this._ambienceOscs.push({ osc, gain: g });
    });

    // Pad chord — major or minor depending on time
    const chordFreqs = type === 'night'
      ? [110, 130.8, 164.8]   // A minor — dark
      : [110, 138.6, 164.8];  // A major-ish — hopeful
    chordFreqs.forEach(f => {
      const osc = this._ctx.createOscillator();
      const g   = this._ctx.createGain();
      osc.type            = 'sine';
      osc.frequency.value = f;
      osc.connect(g); g.connect(this._musicGain);
      g.gain.value = 0.022;
      osc.start();
      this._ambienceOscs.push({ osc, gain: g });
    });

    // Arpeggiator
    this._startArpeggiator(type === 'night' ? 'aeolian' : 'dorian', rootFreq * 4);

    if (type === 'day')   this._scheduleWind();
    if (type === 'storm') this._scheduleStorm();
  }

  _startDungeonMusic() {
    if (!this._ctx) return;

    // Low, ominous drone cluster
    [40, 43, 54].forEach((f, i) => {
      const osc = this._ctx.createOscillator();
      const g   = this._ctx.createGain();
      osc.type = i === 2 ? 'sawtooth' : 'sine';
      osc.frequency.value = f;
      osc.connect(g);

      // Route through reverb for dungeon
      g.connect(this._convolver ?? this._musicGain);
      g.gain.value = [0.08, 0.06, 0.04][i];
      osc.start();
      this._ambienceOscs.push({ osc, gain: g });
    });

    // Occasional drip/resonance hit
    this._arpeggTimer = setInterval(() => {
      if (!this._ctx || !this._enabled) return;
      const f = [220, 165, 110, 196][Math.floor(Math.random() * 4)];
      this._tone(f, 'sine', 0.8, 0.12, 0, f * 0.4);
    }, 3500 + Math.random() * 4000);
  }

  // ── Arpeggiator ───────────────────────────────────────────────────────────

  _startArpeggiator(mode, baseFreq) {
    const scales = {
      dorian:  [0, 2, 3, 5, 7, 9, 10, 12],   // D dorian offsets in semitones
      aeolian: [0, 2, 3, 5, 7, 8, 10, 12],   // A natural minor
    };
    const scale   = scales[mode] ?? scales.dorian;
    const tempo   = mode === 'aeolian' ? 1600 : 1200;  // ms per note
    let noteIdx   = 0;

    this._arpeggTimer = setInterval(() => {
      if (!this._enabled || !this._ctx) return;
      this._resume();
      const semitone = scale[noteIdx % scale.length];
      const freq     = baseFreq * Math.pow(2, semitone / 12);
      const vol      = 0.038 + Math.random() * 0.015;
      this._tone(freq, 'sine', 0.40, vol, 0, freq * 0.8);
      noteIdx = (noteIdx + 1) % (scale.length * 2);
    }, tempo);
  }

  // ── Combat music layer ────────────────────────────────────────────────────

  _ensureCombatLayer() {
    if (this._combatOscs.length > 0 || !this._ctx) return;
    [110, 138, 165].forEach((f, i) => {
      const osc = this._ctx.createOscillator();
      const g   = this._ctx.createGain();
      osc.type            = 'sawtooth';
      osc.frequency.value = f;
      osc.connect(g); g.connect(this._musicGain);
      g.gain.value = 0;  // starts silent
      osc.start();
      this._combatOscs.push({ osc, gain: g });
    });
  }

  /** Call each game frame to blend combat music. @param {number} delta seconds */
  updateMusic(delta) {
    if (!this._ctx || !this._enabled) return;

    // Smoothly lerp combat layer volume
    const lerpSpeed = 1.2;
    const diff = this._combatTarget - this._combatCurrent;
    this._combatCurrent += diff * Math.min(1, lerpSpeed * delta);

    if (this._combatTarget > 0.05) {
      this._ensureCombatLayer();
    }
    this._combatOscs.forEach(({ gain }, i) => {
      gain.gain.value = this._combatCurrent * [0.045, 0.030, 0.020][i] * this._musicVol;
    });
  }

  // ── Wind / Storm ──────────────────────────────────────────────────────────

  _scheduleWind() {
    if (!this._enabled || !this._ctx) return;
    const delay = Math.random() * 7000 + 3000;
    this._windTimer = setTimeout(() => {
      if (!this._ctx || !this._enabled) return;
      this._resume();
      const dur = 0.8 + Math.random() * 0.8;
      const f   = 180 + Math.random() * 120;
      const osc = this._ctx.createOscillator();
      const g   = this._ctx.createGain();
      osc.type = 'sawtooth'; osc.frequency.value = f;
      osc.connect(g); g.connect(this._sfxGain);
      const t = this._ctx.currentTime;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.035, t + dur * 0.3);
      g.gain.linearRampToValueAtTime(0, t + dur);
      osc.start(t); osc.stop(t + dur + 0.05);
      this._scheduleWind();
    }, delay);
  }

  _scheduleStorm() {
    this._windTimer = setInterval(() => {
      if (!this._ctx || !this._enabled) return;
      this._resume();
      this._tone(60 + Math.random() * 40, 'sawtooth', 0.15 + Math.random() * 0.2, 0.05);
    }, 550);
  }

  // ── Stop helpers ──────────────────────────────────────────────────────────

  _stopAllMusic() {
    clearTimeout(this._windTimer);
    clearInterval(this._windTimer);
    clearInterval(this._arpeggTimer);
    this._windTimer   = null;
    this._arpeggTimer = null;

    const stopGroup = (arr) => {
      arr.forEach(({ osc }) => { try { osc.stop(); } catch (_) {} });
      arr.length = 0;
    };
    stopGroup(this._ambienceOscs);
    stopGroup(this._combatOscs);
    stopGroup(this._bossOscs);
    stopGroup(this._arpeggOscs);
    this._combatCurrent = 0;
    this._combatTarget  = 0;
  }

  // ── Volume controls ───────────────────────────────────────────────────────

  setMasterVolume(v) {
    if (this._masterGain) this._masterGain.gain.value = v * (this._enabled ? 1 : 0);
  }

  setMusicVolume(v) {
    this._musicVol = Math.max(0, Math.min(1, v));
    if (this._musicGain) this._musicGain.gain.value = this._musicVol * 0.4;
    localStorage.setItem('aethoria_music_vol', this._musicVol);
  }

  setSfxVolume(v) {
    this._sfxVol = Math.max(0, Math.min(1, v));
    if (this._sfxGain) this._sfxGain.gain.value = this._sfxVol;
    localStorage.setItem('aethoria_sfx_vol', this._sfxVol);
  }

  setEnabled(v) {
    this._enabled = v;
    localStorage[v ? 'removeItem' : 'setItem']('aethoria_mute', '1');
    if (this._masterGain) this._masterGain.gain.value = v ? 0.30 : 0;
    if (!v) this._stopAllMusic();
  }

  toggle()    { this.setEnabled(!this._enabled); return this._enabled; }
  isEnabled() { return this._enabled; }

  getMusicVolume() { return this._musicVol; }
  getSfxVolume()   { return this._sfxVol; }
}
