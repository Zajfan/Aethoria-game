/**
 * WeatherSystem.js — Aethoria v0.7
 *
 * Turns weather from a visual-only effect into a gameplay layer.
 *
 * CLEAR   — baseline. No modifiers.
 * RAIN    — enemies move 20% slower. Footstep sounds muffled.
 *            Lightning-type attacks deal +15% damage.
 * FOG     — enemy detection range −40%. Player minimap dims.
 *            Fog-adapted enemies (Phantoms, Wraiths) gain +25% attack.
 * STORM   — RAIN + FOG effects. Chain Lightning bounces +1 extra time.
 *            Thunder SFX. Screen flickers on lightning strikes.
 *            +30% XP from all kills (dramatic conditions = glory).
 * BLIZZARD— NEW. Enemies FREEZE 3s on hit. Player speed −10%.
 *            Ice-type skills deal double damage.
 *
 * Integration points:
 *   weatherSys.getEnemySpeedMult()   → applied in Enemy3D.update()
 *   weatherSys.getDetectRangeMult()  → applied in Enemy3D.DETECT
 *   weatherSys.getXPMult()           → applied in Player3D.gainXP()
 *   weatherSys.getDamageMult(type)   → applied in ability execute()
 *   weatherSys.isActive(type)        → query current weather
 */

import { CONFIG } from '../config.js';

// ── Weather effect tables ─────────────────────────────────────────────────────

const EFFECTS = {
  CLEAR: {
    enemySpeedMult:   1.0,
    detectRangeMult:  1.0,
    xpMult:           1.0,
    playerSpeedMult:  1.0,
    lightningDmgMult: 1.0,
    iceDmgMult:       1.0,
    phantomBuff:      false,
    freezeOnHit:      false,
    thunderFlicker:   false,
    fogAdaptedBuff:   1.0,
    hintMsg:          null,
  },
  RAIN: {
    enemySpeedMult:   0.80,
    detectRangeMult:  0.90,
    xpMult:           1.10,
    playerSpeedMult:  1.0,
    lightningDmgMult: 1.15,
    iceDmgMult:       1.0,
    phantomBuff:      false,
    freezeOnHit:      false,
    thunderFlicker:   false,
    fogAdaptedBuff:   1.0,
    hintMsg:          '🌧 Rain — enemies slow, lightning stronger',
  },
  FOG: {
    enemySpeedMult:   0.95,
    detectRangeMult:  0.60,
    xpMult:           1.15,
    playerSpeedMult:  1.0,
    lightningDmgMult: 1.0,
    iceDmgMult:       1.0,
    phantomBuff:      true,
    freezeOnHit:      false,
    thunderFlicker:   false,
    fogAdaptedBuff:   1.25,
    hintMsg:          '🌫 Fog — reduced visibility, beware of Phantoms',
  },
  STORM: {
    enemySpeedMult:   0.75,
    detectRangeMult:  0.55,
    xpMult:           1.30,
    playerSpeedMult:  1.0,
    lightningDmgMult: 1.40,
    iceDmgMult:       1.0,
    phantomBuff:      true,
    freezeOnHit:      false,
    thunderFlicker:   true,
    fogAdaptedBuff:   1.25,
    hintMsg:          '⛈ Storm — +30% XP, chain lightning devastating, fog creatures stronger',
  },
  BLIZZARD: {
    enemySpeedMult:   0.70,
    detectRangeMult:  0.65,
    xpMult:           1.25,
    playerSpeedMult:  0.90,
    lightningDmgMult: 0.80,
    iceDmgMult:       2.00,
    phantomBuff:      false,
    freezeOnHit:      true,
    thunderFlicker:   false,
    fogAdaptedBuff:   1.0,
    hintMsg:          '❄ Blizzard — hits freeze enemies, ice skills devastating, you move slower',
  },
};

// Add BLIZZARD to CONFIG weather pool (10% chance)
if (CONFIG.WEATHER_TYPES && !CONFIG.WEATHER_TYPES.includes('BLIZZARD')) {
  CONFIG.WEATHER_TYPES.push('BLIZZARD');
}

// ── WeatherSystem ─────────────────────────────────────────────────────────────

export class WeatherSystem {
  constructor(eventBus) {
    this._bus     = eventBus;
    this._current = 'CLEAR';
    this._effects = EFFECTS.CLEAR;

    // Lightning flicker state
    this._flickerTimer   = 0;
    this._flickerActive  = false;
    this._canvas         = null;

    if (eventBus) {
      eventBus.on('weatherChanged', w => this._onWeatherChange(w));
    }
  }

  attach(canvas) {
    this._canvas = canvas;
  }

  // ── Event handler ─────────────────────────────────────────────────────────

  _onWeatherChange(weather) {
    const prev    = this._current;
    this._current = weather;
    this._effects = EFFECTS[weather] ?? EFFECTS.CLEAR;

    if (this._effects.hintMsg) {
      this._bus?.emit('hudLog', { msg: this._effects.hintMsg, color: '#aaccff' });
    }

    // Blizzard starts with a special announcement
    if (weather === 'BLIZZARD' && prev !== 'BLIZZARD') {
      this._bus?.emit('hudLog', { msg: '❄ A blizzard descends — everything slows, ice reigns.', color: '#88ddff' });
    }

    this._bus?.emit('weatherEffectsChanged', this._effects);
  }

  // ── Gameplay queries ──────────────────────────────────────────────────────

  isActive(weatherType) { return this._current === weatherType; }
  getCurrent()           { return this._current; }

  getEnemySpeedMult()   { return this._effects.enemySpeedMult; }
  getDetectRangeMult()  { return this._effects.detectRangeMult; }
  getXPMult()           { return this._effects.xpMult; }
  getPlayerSpeedMult()  { return this._effects.playerSpeedMult; }
  isFreezeOnHit()       { return this._effects.freezeOnHit; }
  isPhantomBuffed()     { return this._effects.phantomBuff; }
  shouldThunderFlicker(){ return this._effects.thunderFlicker; }
  getFogAdaptedBuff()   { return this._effects.fogAdaptedBuff; }

  /**
   * Get damage multiplier for a given damage type.
   * @param {'lightning'|'ice'|'fire'|'physical'} type
   */
  getDamageMult(type) {
    if (type === 'lightning') return this._effects.lightningDmgMult;
    if (type === 'ice')       return this._effects.iceDmgMult;
    return 1.0;
  }

  /**
   * Check if an enemy type benefits from current fog/phantom buff.
   */
  getEnemyTypeMult(enemyTypeKey) {
    const fogAdapted = ['WRAITH', 'PHANTOM', 'CULTIST'];
    if (this._effects.phantomBuff && fogAdapted.includes(enemyTypeKey)) {
      return this._effects.fogAdaptedBuff;
    }
    return 1.0;
  }

  // ── Update (lightning flicker) ────────────────────────────────────────────

  update(delta) {
    if (!this._effects.thunderFlicker || !this._canvas) return;

    this._flickerTimer -= delta;
    if (this._flickerTimer <= 0) {
      // Random lightning flash
      this._flickerTimer = 8 + Math.random() * 20;
      this._triggerLightningFlash();
    }
  }

  _triggerLightningFlash() {
    if (!this._canvas) return;
    let flashes = 0;
    const maxFlashes = 2 + Math.floor(Math.random() * 3);
    const flash = () => {
      if (flashes >= maxFlashes) {
        this._canvas.style.filter = '';
        return;
      }
      this._canvas.style.filter = 'brightness(2.5) contrast(1.2)';
      setTimeout(() => {
        this._canvas.style.filter = '';
        setTimeout(() => {
          flashes++;
          flash();
        }, 60 + Math.random() * 80);
      }, 40 + Math.random() * 60);
    };
    flash();
    // Thunder SFX via event
    setTimeout(() => this._bus?.emit('thunderClap'), 200 + Math.random() * 800);
  }
}
