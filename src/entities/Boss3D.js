/**
 * Boss3D.js
 * 3D boss entity for the Aethoria RPG, extending Enemy3D.
 *
 * Additional features over Enemy3D:
 *  - Phase transitions (same logic as Boss.js) with attack boosts
 *  - SLAM state: brief wind-up then AoE hit + event
 *  - Aura PointLight that pulses
 *  - VOID_KNIGHT: dark purple armour, glowing magenta eye visor (PointLight)
 *  - STONE_COLOSSUS: large rocky figure, boulder fists
 *
 * Constructor: new Boss3D(scene3d, x, z, typeKey, eventBus, world3d)
 */

import { THREE }    from '../engine/Renderer.js';
import { Enemy3D }  from './Enemy3D.js';
import { CONFIG }   from '../config.js';

// ── AI states (extends Enemy3D's set with SLAM) ───────────────────────────
const S = Object.freeze({ IDLE: 0, PATROL: 1, CHASE: 2, ATTACK: 3, SLAM: 4, DEAD: 5 });

// ── Helpers ───────────────────────────────────────────────────────────────

function _mat(color, opts = {}) {
  return new THREE.MeshLambertMaterial({ color, ...opts });
}

function _box(w, h, d) {
  return new THREE.BoxGeometry(w, h, d);
}

function _randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Boss3D ────────────────────────────────────────────────────────────────

export class Boss3D extends Enemy3D {
  /**
   * @param {THREE.Scene}  scene3d
   * @param {number}       x         World X
   * @param {number}       z         World Z
   * @param {string}       typeKey   Key in CONFIG.BOSS_TYPES
   * @param {EventBus}     eventBus
   * @param {object|null}  world3d
   */
  constructor(scene3d, x, z, typeKey, eventBus, world3d = null) {
    // Enemy3D constructor will try CONFIG.ENEMY_TYPES[typeKey], fall back to
    // GOBLIN, then we immediately override everything below.
    super(scene3d, x, z, typeKey, eventBus, world3d);

    const d = CONFIG.BOSS_TYPES[typeKey] || CONFIG.BOSS_TYPES.VOID_KNIGHT;
    this._data   = d;
    this.typeKey = typeKey;

    // Override stats with boss values
    this.stats = {
      hp:    d.hp,
      maxHp: d.hp,
      atk:   d.atk,
      def:   d.def,
      spd:   d.spd / 16, // px/s → world-units/s
    };

    this.phase  = 0;
    this.slamCD = 0;       // ms
    this._slamTimer = 0;   // ms wind-up counter
    this._pulseTime = 0;   // seconds accumulated for light pulsing

    // Larger detection / leash radii
    this.DETECT = 20;
    this.LEASH  = 35;
    this.ATK_R  =  3.5;

    // Rebuild model with boss-specific mesh (clears the enemy fallback)
    while (this.group.children.length) {
      this.group.remove(this.group.children[0]);
    }
    this._buildBossModel(typeKey);

    // Ambient aura PointLight
    this._auraLight = new THREE.PointLight(d.color, 1.8, 9);
    this._auraLight.position.set(0, 1.0, 0);
    this.group.add(this._auraLight);

    // Update the floating label name
    if (this._labelEl) {
      const nameEl = this._labelEl.querySelector('.entity-label-name');
      if (nameEl) {
        nameEl.textContent = `★ ${d.name} ★`;
        nameEl.style.color = '#dd88ff';
        nameEl.style.fontSize = '13px';
      }
      // Make HP bar wider for bosses
      const hpTrack = this._labelEl.querySelector('div > div');
      if (hpTrack) hpTrack.style.width = '72px';
    }
  }

  // ── Boss model builders ───────────────────────────────────────────────────

  _buildBossModel(typeKey) {
    switch (typeKey) {
      case 'VOID_KNIGHT':    this._buildVoidKnight();    break;
      case 'STONE_COLOSSUS': this._buildStoneColossus(); break;
      default:               this._buildVoidKnight();
    }
  }

  _buildVoidKnight() {
    const purple = _mat(0x4a0080);
    const dark   = _mat(0x1a0033);
    const silver = _mat(0x778899);

    const add = (geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      this.group.add(m);
      return m;
    };

    // Armoured torso
    add(_box(0.90, 1.10, 0.50), purple,  0,     1.05,  0);
    // Helm
    add(_box(0.62, 0.62, 0.62), dark,    0,     1.87,  0);
    // Pauldrons (shoulder guards)
    add(_box(0.35, 0.78, 0.32), purple, -0.65,  1.05,  0);
    add(_box(0.35, 0.78, 0.32), purple,  0.65,  1.05,  0);
    // Legs
    add(_box(0.38, 0.75, 0.36), dark,   -0.22,  0.38,  0);
    add(_box(0.38, 0.75, 0.36), dark,    0.22,  0.38,  0);
    // Sword
    add(_box(0.10, 1.20, 0.08), silver,  0.88,  0.85,  0);

    // Glowing eye visor (emissive mesh + PointLight)
    const visorMat = _mat(0xff00ff, { emissive: new THREE.Color(0xaa00aa) });
    const visor    = new THREE.Mesh(_box(0.38, 0.10, 0.07), visorMat);
    visor.position.set(0, 1.87, 0.33);
    this.group.add(visor);
    this._visorMesh = visor;

    this._eyeLight = new THREE.PointLight(0xff00ff, 2.5, 3.5);
    this._eyeLight.position.set(0, 1.87, 0.45);
    this.group.add(this._eyeLight);

    this.group.scale.setScalar(1.3);
  }

  _buildStoneColossus() {
    const stone = _mat(0x887755);
    const dark  = _mat(0x554433);

    const add = (geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      this.group.add(m);
      return m;
    };

    // Massive torso
    add(_box(1.40, 1.50, 0.90), stone,  0,     1.25,  0);
    // Head
    add(_box(0.85, 0.85, 0.85), stone,  0,     2.30,  0);
    // Arms (thick)
    add(_box(0.55, 1.00, 0.50), dark,  -1.05,  1.25,  0);
    add(_box(0.55, 1.00, 0.50), dark,   1.05,  1.25,  0);
    // Legs
    add(_box(0.55, 1.00, 0.50), stone, -0.38,  0.25,  0);
    add(_box(0.55, 1.00, 0.50), stone,  0.38,  0.25,  0);

    // Boulder fists (spheres)
    const fistGeo = new THREE.SphereGeometry(0.35, 6, 6);
    const fistMat = _mat(0x665544);
    const fistL   = new THREE.Mesh(fistGeo, fistMat);
    fistL.position.set(-1.05, 0.70, 0);
    fistL.castShadow = true;
    this.group.add(fistL);
    const fistR = new THREE.Mesh(fistGeo, fistMat);
    fistR.position.set( 1.05, 0.70, 0);
    fistR.castShadow = true;
    this.group.add(fistR);

    this.group.scale.setScalar(1.6);
  }

  // ── Boss-specific update ──────────────────────────────────────────────────

  /** @param {number} delta   Seconds since last frame */
  update(delta, player) {
    if (this.isDead) {
      this._tickFade(delta);
      return;
    }

    const deltaMs = delta * 1000;
    this.atkCD      = Math.max(0, this.atkCD  - deltaMs);
    this.slamCD     = Math.max(0, this.slamCD - deltaMs);
    this._pulseTime += delta;

    const dp = player ? this.position.distanceTo(player.position) : Infinity;

    // ── Phase transitions ──────────────────────────────────────────────────
    const ratio = this.stats.maxHp > 0 ? this.stats.hp / this.stats.maxHp : 0;
    (this._data.phases || []).forEach((ph, i) => {
      if (this.phase === i && ratio <= ph.threshold) {
        this.phase = i + 1;
        this._onPhaseChange(ph);
      }
    });

    // Pulse eye light for VOID_KNIGHT
    if (this._eyeLight) {
      this._eyeLight.intensity = 1.8 + Math.sin(this._pulseTime * 5.0) * 0.9;
    }
    // Pulse aura light
    if (this._auraLight) {
      this._auraLight.intensity = 1.2 + Math.sin(this._pulseTime * 3.0) * 0.6;
    }

    // ── State machine ──────────────────────────────────────────────────────
    switch (this.state) {
      case S.IDLE:
        this.velocity.set(0, 0, 0);
        if (dp < 20) this.state = S.CHASE;
        break;

      case S.CHASE: {
        if (dp > 32) { this.state = S.IDLE; break; }
        if (dp <= this.ATK_R) { this.state = S.ATTACK; break; }

        // Phase 1+: slam if player close enough and slam off cooldown
        if (this.phase >= 1 && this.slamCD === 0 && dp < 10) {
          this.state      = S.SLAM;
          this._slamTimer = 0;
          break;
        }

        if (player) {
          const dir = new THREE.Vector3()
            .subVectors(player.position, this.position)
            .setY(0)
            .normalize();
          const speed = this.stats.spd * (1 + this.phase * 0.30);
          this.velocity.copy(dir).multiplyScalar(speed);
        }
        break;
      }

      case S.ATTACK:
        this.velocity.set(0, 0, 0);
        if (dp > this.ATK_R + 0.90) { this.state = S.CHASE; break; }
        if (this.atkCD === 0 && player) {
          const dmg = Math.max(1, this.stats.atk + _randInt(-4, 4));
          player.takeDamage(dmg);
          this.atkCD = Math.max(500, 1100 - this.phase * 220);
          this.eventBus.emit('damage', this.position.x, this.position.y, dmg, '#dd88ff');
        }
        break;

      case S.SLAM:
        this.velocity.set(0, 0, 0);
        this._slamTimer += deltaMs;
        if (this._slamTimer >= 400) {
          // Execute AoE hit
          if (player && this.position.distanceTo(player.position) < 7.5) {
            player.takeDamage(Math.floor(this.stats.atk * 1.6));
          }
          this.eventBus.emit('bossSlam', {
            x:     this.position.x,
            y:     0,
            z:     this.position.z,
            color: this._data.color,
          });
          this.slamCD     = 5000;
          this._slamTimer = 0;
          this.state      = S.CHASE;
        }
        break;
    }

    // Always face the player during combat
    if (player && this.state !== S.IDLE) {
      const dx = player.position.x - this.position.x;
      const dz = player.position.z - this.position.z;
      this.group.rotation.y = Math.atan2(dx, dz);
    }

    this.position.addScaledVector(this.velocity, delta);
    this.position.y = 0;
    this.group.position.copy(this.position);
    this._updateLabelPosition();
  }

  // ── Phase change ──────────────────────────────────────────────────────────

  _onPhaseChange(ph) {
    this.eventBus.emit('bossPhase', ph.msg);

    // Boost attack on each phase
    this.stats.atk = Math.floor(this.stats.atk * 1.25);

    // Brief emissive flash on all meshes
    this.group.traverse(obj => {
      if (!obj.isMesh || !obj.material) return;
      const mat = obj.material;
      if (mat.emissive) {
        mat.emissive.setHex(0xffffff);
        setTimeout(() => {
          if (mat.emissive) mat.emissive.setHex(0x000000);
        }, 220);
      }
    });
  }

  // ── Damage / death ────────────────────────────────────────────────────────

  takeDamage(amount, attacker) {
    if (this.isDead) return;
    const act = Math.max(1, amount - Math.floor(this.stats.def / 2));
    this.stats.hp = Math.max(0, this.stats.hp - act);
    this.eventBus.emit('damage', this.position.x, this.position.y, act, '#dd88ff');
    this.state = S.CHASE;
    if (this.stats.hp <= 0) this._dieBoss(attacker);
  }

  _dieBoss(killer) {
    this.isDead = true;
    this.state  = S.DEAD;
    this.velocity.set(0, 0, 0);

    if (killer?.attackTarget === this) killer.attackTarget = null;
    if (killer) killer.gainXP(this._data.xp);

    // Loot
    for (const itemKey of (this._data.loot || [])) {
      const ox = (Math.random() - 0.5) * 3.75;
      const oz = (Math.random() - 0.5) * 3.75;
      this.eventBus.emit('spawnLoot', {
        x: this.position.x + ox,
        y: 0,
        z: this.position.z + oz,
        itemKey,
      });
    }

    this.eventBus.emit('bossKilled', this._data.name);
    this.eventBus.emit('damage', this.position.x, this.position.y, '☠ DEFEATED', '#ffd700');

    // Fade out then dispose (bosses do not respawn)
    this._startFade(1.4, () => {
      if (this._auraLight) {
        this.group.remove(this._auraLight);
        this._auraLight.dispose();
        this._auraLight = null;
      }
      if (this._eyeLight) {
        this.group.remove(this._eyeLight);
        this._eyeLight.dispose();
        this._eyeLight = null;
      }
      this.dispose();
    });
  }
}
