/**
 * DungeonFeatures.js  — Aethoria v0.5
 *
 * Adds interactive dungeon features on top of DungeonScene3D:
 *
 *  TreasureChest   — glowing animated chest, randomised loot tier
 *  FloorTrap       — pressure-plate spike/fire trap, visible tell
 *  SecretDoor      — hidden wall passage revealed by interaction
 *  PressurePlate   — triggers a room event (enemy spawn, loot drop, trap)
 *
 * Usage (from DungeonScene3D.create()):
 *   this.dungeonFeatures = new DungeonFeatures(scene3d, eventBus, mapData);
 *   this.dungeonFeatures.placeFeatures(rooms, camera);
 *   // In update():
 *   this.dungeonFeatures.update(delta, player);
 *   // In dispose():
 *   this.dungeonFeatures.dispose();
 */

import { THREE } from '../engine/Renderer.js';
import { CONFIG } from '../config.js';

// ── Loot tier tables ──────────────────────────────────────────────────────────

const CHEST_TIERS = {
  COMMON: {
    color:     0x8b6914,
    glowColor: 0xffaa22,
    loot:      ['gold', 'herb', 'herb', 'silver', 'leather'],
    goldBonus: [10, 30],
    label:     'Chest',
  },
  RARE: {
    color:     0x2255aa,
    glowColor: 0x4488ff,
    loot:      ['potion', 'sword', 'axe', 'shield', 'scroll', 'gem'],
    goldBonus: [30, 80],
    label:     '★ Rare Chest',
  },
  LEGENDARY: {
    color:     0x9900cc,
    glowColor: 0xcc44ff,
    loot:      ['elixir', 'crystal', 'crystal', 'gem', 'staff'],
    goldBonus: [80, 200],
    label:     '✦ Legendary Chest',
  },
};

// ── Trap types ────────────────────────────────────────────────────────────────

const TRAP_TYPES = {
  SPIKE: {
    color:    0x888888,
    armColor: 0xffaa00,  // plate glows orange when about to trigger
    damage:   [12, 28],
    triggerDelay: 0.4,   // seconds between step and firing
    resetTime:    4.0,   // seconds before trap resets
    label:    '⚠ Spike Trap',
  },
  FIRE: {
    color:    0x333333,
    armColor: 0xff4400,
    damage:   [8, 18],
    triggerDelay: 0.2,
    resetTime:    5.0,
    label:    '⚠ Fire Trap',
    applyBurn: true,
  },
  VOID: {
    color:    0x220033,
    armColor: 0xcc00ff,
    damage:   [15, 35],
    triggerDelay: 0.6,
    resetTime:    6.0,
    label:    '⚠ Void Trap',
    applyCurse: true,
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function rand(a, b)    { return a + Math.random() * (b - a); }

function makeLabel(overlay, text, color) {
  const el = document.createElement('div');
  el.style.cssText = `
    position:absolute; pointer-events:none; display:none;
    font-family:'Courier New',monospace; font-size:9px;
    color:${color}; text-shadow:0 0 6px ${color},1px 1px 2px #000;
    transform:translate(-50%,-100%); white-space:nowrap;
  `;
  el.textContent = text;
  overlay.appendChild(el);
  return el;
}

// ── TreasureChest ─────────────────────────────────────────────────────────────

class TreasureChest {
  constructor(scene3d, x, z, tier = 'COMMON', eventBus, overlay, camera) {
    this._scene    = scene3d;
    this._bus      = eventBus;
    this._camera   = camera;
    this._tier     = CHEST_TIERS[tier] ?? CHEST_TIERS.COMMON;
    this._opened   = false;
    this.position  = new THREE.Vector3(x, 0.0, z);

    this._buildMesh(x, z);
    this._labelEl = makeLabel(overlay,
      this._tier.label,
      '#' + this._tier.glowColor.toString(16).padStart(6, '0'),
    );
  }

  _buildMesh(x, z) {
    const group = new THREE.Group();

    const boxMat = new THREE.MeshLambertMaterial({ color: this._tier.color });
    const lidMat = new THREE.MeshLambertMaterial({ color: 0x5a3a10 });
    const bandMat = new THREE.MeshLambertMaterial({ color: 0xccaa44 });

    // Base
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.40, 0.50), boxMat);
    base.position.set(0, 0.20, 0);
    base.castShadow = true;
    group.add(base);

    // Lid (pivots on top edge)
    this._lid = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.28, 0.50), lidMat);
    this._lid.position.set(0, 0.54, 0);
    this._lid.castShadow = true;
    group.add(this._lid);

    // Iron bands
    for (const bx of [-0.20, 0.20]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.52, 0.54), bandMat);
      band.position.set(bx, 0.35, 0);
      group.add(band);
    }

    // Glow light
    this._light = new THREE.PointLight(this._tier.glowColor, 1.4, 4);
    this._light.position.set(x, 0.8, z);
    this._scene.add(this._light);

    group.position.set(x, 0, z);
    group.userData.isChest = true;
    this._group = group;
    this._scene.add(group);

    // Floating animation state
    this._t = Math.random() * Math.PI * 2;
    this._lidOpen = 0;  // 0 = closed, 1 = open
  }

  update(delta, player, camera) {
    this._t += delta;

    // Gentle glow pulse
    this._light.intensity = 1.2 + Math.sin(this._t * 2.4) * 0.5;

    // Lid animation when opened
    if (this._lidOpen > 0 && this._lidOpen < 1) {
      this._lidOpen = Math.min(1, this._lidOpen + delta * 3);
      this._lid.rotation.x = -this._lidOpen * 1.2;
    }

    // Label projection
    if (camera && !this._opened) {
      const wp = this.position.clone();
      wp.y += 0.9;
      wp.project(camera);
      if (wp.z < 1) {
        const sx = (wp.x *  0.5 + 0.5) * window.innerWidth;
        const sy = (wp.y * -0.5 + 0.5) * window.innerHeight;
        const dist = player ? player.position.distanceTo(this.position) : 999;
        this._labelEl.style.display = dist < 3 ? 'block' : 'none';
        this._labelEl.style.left = sx + 'px';
        this._labelEl.style.top  = sy + 'px';
      } else {
        this._labelEl.style.display = 'none';
      }
    }
  }

  open(player) {
    if (this._opened) return;
    this._opened   = true;
    this._lidOpen  = 0.01;
    this._labelEl.style.display = 'none';
    this._light.color.set(0xffffff);

    const tier = this._tier;
    // Drop 2-4 items
    const itemCount = randInt(2, 4);
    const pool = [...tier.loot];
    for (let i = 0; i < itemCount; i++) {
      const item = pool[Math.floor(Math.random() * pool.length)];
      this._bus?.emit('spawnLoot', {
        x: this.position.x + (Math.random() - 0.5) * 1.5,
        y: 0.3,
        z: this.position.z + (Math.random() - 0.5) * 1.5,
        itemKey: item,
      });
    }

    // Gold bonus
    const gold = randInt(tier.goldBonus[0], tier.goldBonus[1]);
    if (player) {
      player.stats.gold = (player.stats.gold ?? 0) + gold;
      player.eventBus?.emit('statsChanged', player.stats);
      player.eventBus?.emit('damage', this.position.x, 0.5, `+${gold}g`, '#ffd700');
    }

    this._bus?.emit('chestOpened', { tier: this._tier.label });
    this._bus?.emit('questProgress', { type: 'COLLECT', target: 'chest' });

    // Dim light after 3s
    setTimeout(() => {
      if (this._light) this._light.intensity = 0.2;
    }, 3000);
  }

  getMesh() { return this._group; }

  dispose() {
    this._scene.remove(this._group);
    this._scene.remove(this._light);
    this._group.traverse(obj => {
      if (obj.isMesh) { obj.geometry.dispose(); obj.material.dispose(); }
    });
    this._light.dispose();
    this._labelEl?.remove();
  }
}

// ── FloorTrap ─────────────────────────────────────────────────────────────────

class FloorTrap {
  constructor(scene3d, x, z, type = 'SPIKE', eventBus, overlay, camera) {
    this._scene   = scene3d;
    this._bus     = eventBus;
    this._camera  = camera;
    this._type    = TRAP_TYPES[type] ?? TRAP_TYPES.SPIKE;
    this.position = new THREE.Vector3(x, 0.01, z);

    this._state   = 'IDLE'; // IDLE → ARMED → FIRING → RESET
    this._timer   = 0;
    this._spikes  = [];

    this._buildMesh(x, z);
    this._labelEl = makeLabel(overlay, this._type.label, '#ff4400');
  }

  _buildMesh(x, z) {
    const group = new THREE.Group();

    // Pressure plate
    const plateMat = new THREE.MeshLambertMaterial({ color: this._type.color });
    const plate    = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.05, 0.85), plateMat);
    plate.position.set(0, 0.025, 0);
    plate.receiveShadow = true;
    group.add(plate);
    this._plateMesh = plate;
    this._plateMat  = plateMat;

    // Spike prongs (hidden initially)
    if (this._type === TRAP_TYPES.SPIKE || !this._type.applyBurn) {
      const spikeMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
      for (let i = 0; i < 9; i++) {
        const sx = -0.28 + (i % 3) * 0.28;
        const sz = -0.28 + Math.floor(i / 3) * 0.28;
        const spike = new THREE.Mesh(
          new THREE.ConeGeometry(0.045, 0.55, 5),
          spikeMat,
        );
        spike.position.set(sx, -0.30, sz); // hidden below plate
        group.add(spike);
        this._spikes.push(spike);
      }
    }

    group.position.set(x, 0, z);
    this._group = group;
    this._scene.add(group);
  }

  update(delta, player, camera) {
    const dist = player ? player.position.distanceTo(this.position) : 99;

    switch (this._state) {
      case 'IDLE':
        if (dist < 0.65) {
          this._state = 'ARMED';
          this._timer = this._type.triggerDelay;
          this._plateMat.color.setHex(this._type.armColor);
          this._labelEl.style.display = 'block';
        }
        break;

      case 'ARMED':
        this._timer -= delta;
        if (this._timer <= 0) {
          this._state = 'FIRING';
          this._timer = 0.4; // spike duration
          this._fire(player);
        }
        break;

      case 'FIRING':
        // Animate spikes rising
        for (const s of this._spikes) {
          s.position.y = Math.min(0.28, s.position.y + delta * 2.5);
        }
        this._timer -= delta;
        if (this._timer <= 0) {
          this._state = 'RESET';
          this._timer = this._type.resetTime;
        }
        break;

      case 'RESET':
        for (const s of this._spikes) {
          s.position.y = Math.max(-0.30, s.position.y - delta * 1.5);
        }
        this._timer -= delta;
        if (this._timer <= 0) {
          this._state = 'IDLE';
          this._plateMat.color.setHex(this._type.color);
          this._labelEl.style.display = 'none';
        }
        break;
    }

    // Label projection
    if (camera && this._state !== 'IDLE') {
      const wp = this.position.clone();
      wp.y += 0.6;
      wp.project(camera);
      if (wp.z < 1) {
        this._labelEl.style.left = ((wp.x * 0.5 + 0.5) * window.innerWidth)  + 'px';
        this._labelEl.style.top  = ((wp.y * -0.5 + 0.5) * window.innerHeight) + 'px';
      }
    }
  }

  _fire(player) {
    if (!player || player.isDead) return;
    const dist = player.position.distanceTo(this.position);
    if (dist > 0.9) return; // player may have dodged

    const dmg = randInt(this._type.damage[0], this._type.damage[1]);
    player.takeDamage(dmg);
    this._bus?.emit('damage', this.position.x, 0.5, `TRAP -${dmg}`, '#ff4400');

    if (this._type.applyBurn) {
      this._bus?.emit('enemyPoisonHit', { target: player, status: 'BURN' });
    }
    if (this._type.applyCurse) {
      this._bus?.emit('enemyPoisonHit', { target: player, status: 'VOID_CURSE' });
    }
  }

  dispose() {
    this._scene.remove(this._group);
    this._group.traverse(obj => {
      if (obj.isMesh) { obj.geometry.dispose(); obj.material.dispose(); }
    });
    this._labelEl?.remove();
  }
}

// ── SecretRoom marker ─────────────────────────────────────────────────────────

class SecretMarker {
  constructor(scene3d, x, z, eventBus) {
    this._scene = scene3d;
    this._bus   = eventBus;
    this.position = new THREE.Vector3(x, 0.5, z);
    this._revealed = false;
    this._t = 0;

    // Faint shimmer particles — small glowing orb at wall face
    const geo = new THREE.SphereGeometry(0.12, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x8844ff, transparent: true, opacity: 0.0,
    });
    this._orb = new THREE.Mesh(geo, mat);
    this._orb.position.copy(this.position);
    scene3d.add(this._orb);
  }

  update(delta, player) {
    this._t += delta;
    const dist = player ? player.position.distanceTo(this.position) : 99;
    // Gently pulse when player is within 3 tiles
    const visible = dist < 3 && !this._revealed;
    this._orb.material.opacity = visible
      ? 0.15 + Math.sin(this._t * 2) * 0.12
      : 0;

    if (visible && dist < 0.9) {
      this._reveal(player);
    }
  }

  _reveal(player) {
    if (this._revealed) return;
    this._revealed = true;
    this._bus?.emit('secretFound', { x: this.position.x, z: this.position.z });
    player?.gainXP(120);
    // Spawn bonus loot
    for (let i = 0; i < 3; i++) {
      this._bus?.emit('spawnLoot', {
        x: this.position.x + (Math.random() - 0.5) * 2,
        y: 0,
        z: this.position.z + (Math.random() - 0.5) * 2,
        itemKey: ['gem', 'crystal', 'elixir', 'scroll'][Math.floor(Math.random() * 4)],
      });
    }
    this._bus?.emit('damage', this.position.x, 0.5, '★ SECRET!', '#cc88ff');
  }

  dispose() {
    this._scene.remove(this._orb);
    this._orb.geometry.dispose();
    this._orb.material.dispose();
  }
}

// ── DungeonFeatures (main export) ─────────────────────────────────────────────

export class DungeonFeatures {
  /**
   * @param {THREE.Scene}   scene3d
   * @param {EventBus}      eventBus
   */
  constructor(scene3d, eventBus) {
    this._scene  = scene3d;
    this._bus    = eventBus;
    this._overlay = document.getElementById('ui-overlay') || document.body;

    this.chests  = [];
    this.traps   = [];
    this.secrets = [];

    this._wireEvents();
  }

  _wireEvents() {
    this._bus?.on('chestOpened', ({ tier }) => {
      // HUD log is handled by GameScene listening for this event
    });
    this._bus?.on('secretFound', () => {});
  }

  /**
   * Place chests, traps, and secrets based on room layout.
   * @param {Array} rooms    Array of { x1,y1,x2,y2,cx,cy } room objects
   * @param {THREE.Camera} camera
   */
  placeFeatures(rooms, camera) {
    this._camera = camera;

    rooms.forEach((room, idx) => {
      // Skip the spawn room (first room)
      if (idx === 0) return;

      const cx = room.cx + 0.5;
      const cz = room.cy + 0.5;

      // Chest in ~60% of rooms — boss room gets Legendary
      const isBossRoom = idx === rooms.length - 1;
      if (isBossRoom) {
        this._placeChest(cx - 1.5, cz + 1.5, 'LEGENDARY');
        this._placeChest(cx + 1.5, cz + 1.5, 'RARE');
      } else if (Math.random() < 0.60) {
        const tier = Math.random() < 0.15 ? 'RARE' : 'COMMON';
        // Offset chest to corner of room
        const ox = (Math.random() - 0.5) * (room.x2 - room.x1 - 2);
        const oz = (Math.random() - 0.5) * (room.y2 - room.y1 - 2);
        this._placeChest(cx + ox, cz + oz, tier);
      }

      // Floor traps in ~40% of non-boss, non-start rooms (corridor choke points)
      if (!isBossRoom && idx > 1 && Math.random() < 0.40) {
        const type = ['SPIKE', 'SPIKE', 'FIRE', 'VOID'][Math.floor(Math.random() * 4)];
        // Place traps near room entrance (edge of room)
        const ex = room.x1 + 1.5;
        const ez = room.cy + 0.5;
        this._placeTrap(ex, ez, type);
      }

      // Secret markers on ~15% of rooms (near walls)
      if (Math.random() < 0.15) {
        const wx = Math.random() < 0.5 ? room.x1 + 0.8 : room.x2 - 0.3;
        const wz = room.cy + 0.5;
        this._placeSecret(wx, wz);
      }
    });
  }

  _placeChest(x, z, tier) {
    const chest = new TreasureChest(
      this._scene, x, z, tier, this._bus, this._overlay, this._camera,
    );
    this.chests.push(chest);
  }

  _placeTrap(x, z, type) {
    const trap = new FloorTrap(
      this._scene, x, z, type, this._bus, this._overlay, this._camera,
    );
    this.traps.push(trap);
  }

  _placeSecret(x, z) {
    const secret = new SecretMarker(this._scene, x, z, this._bus);
    this.secrets.push(secret);
  }

  /** @param {number} delta  @param {object} player  @param {THREE.Camera} camera */
  update(delta, player, camera) {
    // Update chests
    for (const chest of this.chests) {
      chest.update(delta, player, camera);
      // Open on player proximity + interaction
      if (!chest._opened && player) {
        const dist = player.position.distanceTo(chest.position);
        if (dist < 1.1 && chest._labelEl?.style.display !== 'none') {
          // Auto-open on proximity (can be changed to key press)
          chest.open(player);
        }
      }
    }

    // Update traps
    for (const trap of this.traps) {
      trap.update(delta, player, camera);
    }

    // Update secrets
    for (const secret of this.secrets) {
      secret.update(delta, player);
    }
  }

  dispose() {
    this.chests.forEach(c => c.dispose());
    this.traps.forEach(t => t.dispose());
    this.secrets.forEach(s => s.dispose());
    this.chests  = [];
    this.traps   = [];
    this.secrets = [];
  }
}
