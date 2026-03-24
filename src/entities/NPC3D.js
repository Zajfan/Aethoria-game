/**
 * NPC3D.js
 * 3D NPC entity for the Aethoria RPG.
 *
 * NPCs stand in place, face the player when nearby, and show a
 * "Press E to talk" indicator.  Merchants display a small item stand.
 * AI dialogue uses AethoriaAI (same as 2D NPC.js).
 *
 * Constructor: new NPC3D(scene3d, x, z, npcIndex, eventBus)
 */

import { THREE }        from '../engine/Renderer.js';
import { Entity3D }     from './Entity3D.js';
import { CONFIG }       from '../config.js';
import { AethoriaAI }   from '../ai/AethoriaAI.js';
import { Keys }         from '../engine/InputManager.js';

// ── Per-NPC colour palettes (aligned with CONFIG.NPCS_DATA order) ─────────
const NPC_PALETTES = [
  { robe: 0xb8860b, hat: 0xffd700, skin: 0xf5cba7 }, // Elder Lyra
  { robe: 0x6b3a2a, hat: 0xff8c00, skin: 0xd4926a }, // Gareth
  { robe: 0x1d5c2a, hat: 0x66cc44, skin: 0xf5cba7 }, // Mira
  { robe: 0x2e2255, hat: 0xaaaaff, skin: 0xf5cba7 }, // Dorin
  { robe: 0x1c2e5e, hat: 0x4488ff, skin: 0xd4926a }, // Capt. Vel
];

// ── Helper ────────────────────────────────────────────────────────────────

function _mat(color) {
  return new THREE.MeshLambertMaterial({ color });
}

function _overlay() {
  return document.getElementById('ui-overlay') || document.body;
}

// ── NPC3D ─────────────────────────────────────────────────────────────────

export class NPC3D extends Entity3D {
  /**
   * @param {THREE.Scene}  scene3d
   * @param {number}       x          World X (Three.js coords)
   * @param {number}       z          World Z
   * @param {number}       npcIndex   Index into CONFIG.NPCS_DATA
   * @param {EventBus}     eventBus
   */
  constructor(scene3d, x, z, npcIndex, eventBus) {
    const data = CONFIG.NPCS_DATA[npcIndex];
    if (!data) throw new Error(`[NPC3D] No NPCS_DATA entry at index ${npcIndex}`);

    super(null, data.name); // camera injected later via setCamera()

    this.npcData  = data;
    this.npcIndex = npcIndex;
    this.eventBus = eventBus;
    this.history  = [];

    // Interaction range in world units (~72 original pixels)
    this._interactRange = 72 / 16;

    // Solid collision radius — prevents the player from walking through the NPC
    this.collisionRadius = 0.55;

    this.position.set(x, 0, z);

    // Override label name colour to match NPC colour
    this._applyLabelColor(data.color);

    this._buildModel(npcIndex);
    this._createInteractHint();

    if (data.role.includes('Merchant')) {
      this._buildMerchantStand();
    }

    this.addToScene(scene3d);
  }

  /** Inject camera after construction (set by the scene). */
  setCamera(camera) {
    this.camera = camera;
  }

  // ── Label ─────────────────────────────────────────────────────────────────

  _applyLabelColor(hexInt) {
    if (!this._labelEl) return;
    const nameEl = this._labelEl.querySelector('.entity-label-name');
    if (!nameEl) return;
    const hex = '#' + hexInt.toString(16).padStart(6, '0');
    nameEl.style.color = hex;

    // Add role sub-line
    const roleEl = document.createElement('div');
    roleEl.style.cssText = `
      font-family: 'Courier New', monospace;
      font-size: 9px;
      color: #888888;
      white-space: nowrap;
      margin-bottom: 2px;
    `;
    roleEl.textContent = `[${this.npcData.role}]`;
    // Insert after name, before HP bar
    nameEl.insertAdjacentElement('afterend', roleEl);
  }

  // ── Model ─────────────────────────────────────────────────────────────────

  _buildModel(idx) {
    const pal  = NPC_PALETTES[idx] || NPC_PALETTES[0];
    const robe = _mat(pal.robe);
    const hat  = _mat(pal.hat);
    const skin = _mat(pal.skin);

    const add = (geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      this.group.add(m);
      return m;
    };

    // Robe — taller, slightly wider than player torso
    add(new THREE.BoxGeometry(0.72, 1.10, 0.42), robe,  0,     0.80, 0);
    // Head
    add(new THREE.BoxGeometry(0.45, 0.45, 0.45), skin,  0,     1.65, 0);
    // Hat brim
    add(new THREE.BoxGeometry(0.68, 0.06, 0.68), hat,   0,     1.95, 0);
    // Hat crown
    add(new THREE.BoxGeometry(0.42, 0.28, 0.42), hat,   0,     2.08, 0);
    // Sleeves
    add(new THREE.BoxGeometry(0.22, 0.50, 0.22), robe, -0.48, 0.95, 0);
    add(new THREE.BoxGeometry(0.22, 0.50, 0.22), robe,  0.48, 0.95, 0);
  }

  // ── Merchant item stand ───────────────────────────────────────────────────

  _buildMerchantStand() {
    // Small table
    const tableMat = _mat(0xaa8833);
    const table    = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.07, 0.85), tableMat);
    table.position.set(1.0, 0.62, 0);
    table.castShadow = true;
    this.group.add(table);

    // Rotating gem on the table
    const gemGeo = new THREE.OctahedronGeometry(0.14, 0);
    const gemMat = new THREE.MeshLambertMaterial({
      color:    0x44aaff,
      emissive: 0x113355,
    });
    this._gemMesh = new THREE.Mesh(gemGeo, gemMat);
    this._gemMesh.position.set(1.0, 0.82, 0);
    this._gemMesh.castShadow = true;
    this.group.add(this._gemMesh);
  }

  // ── Interact hint DOM element ─────────────────────────────────────────────

  _createInteractHint() {
    this._hintEl = document.createElement('div');
    Object.assign(this._hintEl.style, {
      position:      'absolute',
      pointerEvents: 'none',
      textAlign:     'center',
      transform:     'translate(-50%, -100%)',
      fontFamily:    "'Courier New', monospace",
      fontSize:      '11px',
      color:         '#ffff88',
      textShadow:    '0 0 4px #000',
      padding:       '2px 8px',
      background:    'rgba(0,0,0,0.55)',
      borderRadius:  '4px',
      display:       'none',
      whiteSpace:    'nowrap',
    });
    this._hintEl.textContent = '▼ Press E to talk';
    _overlay().appendChild(this._hintEl);
  }

  // ── Update ────────────────────────────────────────────────────────────────

  /**
   * @param {number}          delta
   * @param {Entity3D|null}   player
   * @param {InputManager|null} inputManager
   */
  update(delta, player, inputManager) {
    if (player && this.camera) {
      const dist = this.position.distanceTo(player.position);

      // Face player when within 1.5× interact range
      if (dist < this._interactRange * 1.5) {
        const dx = player.position.x - this.position.x;
        const dz = player.position.z - this.position.z;
        this.group.rotation.y = Math.atan2(dx, dz);
      }

      const inRange = dist < this._interactRange;

      // Position and show/hide the hint label
      if (inRange) {
        this._positionHint(3.2);
        this._hintEl.style.display = 'block';
      } else {
        this._hintEl.style.display = 'none';
      }

      // E key → emit npcInteract
      if (inRange && inputManager?.isPressed(Keys.E)) {
        this.eventBus.emit('npcInteract', {
          npcIndex: this.npcIndex,
          npcData:  this.npcData,
        });
      }
    }

    // Spin merchant gem
    if (this._gemMesh) {
      this._gemMesh.rotation.y += delta * 1.5;
    }

    this.group.position.copy(this.position);
    this._updateLabelPosition();
  }

  /** Project a world point above the NPC to screen space for the hint div. */
  _positionHint(yOffset) {
    if (!this.camera || !this._hintEl) return;
    const wp = new THREE.Vector3(
      this.position.x,
      this.position.y + yOffset,
      this.position.z,
    );
    wp.project(this.camera);
    if (wp.z > 1) {
      this._hintEl.style.display = 'none';
      return;
    }
    const sx = (wp.x *  0.5 + 0.5) * window.innerWidth;
    const sy = (wp.y * -0.5 + 0.5) * window.innerHeight;
    this._hintEl.style.left = `${sx}px`;
    this._hintEl.style.top  = `${sy}px`;
  }

  // ── AI dialogue (same contract as 2D NPC.talk()) ──────────────────────────

  /**
   * Send a message to the NPC and receive an in-character reply.
   * @param {string}      playerInput
   * @param {object}      playerStats
   * @param {string|null} worldEventName
   * @returns {Promise<string>}
   */
  async talk(playerInput, playerStats, worldEventName = null) {
    const tradeHint = this.npcData.role.includes('Merchant')
      ? ' You also run a small shop — mention it naturally if asked about goods.'
      : '';
    const eventHint = worldEventName
      ? ` The world event "${worldEventName}" is happening right now — react to it naturally.`
      : '';

    const sys =
`You are ${this.npcData.name}, ${this.npcData.role} in the fantasy realm of Aethoria.
Background: ${this.npcData.bio}
World lore: ${CONFIG.WORLD_LORE}
Player status: Level ${playerStats?.level || 1}, HP ${playerStats?.hp || 100}/${playerStats?.maxHp || 100}, Gold ${playerStats?.gold || 0}, Class ${playerStats?.class || 'unknown'}.
${tradeHint}${eventHint}
Respond in character in 2-3 sentences max. Be vivid, helpful, lore-rich. Never mention AI or break character.`;

    this.history.push({ role: 'user', content: playerInput });
    const reply = await AethoriaAI.chat(sys, this.history, this.npcData.name);
    this.history.push({ role: 'assistant', content: reply });
    if (this.history.length > 20) this.history = this.history.slice(-20);
    return reply;
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  dispose() {
    this._hintEl?.parentNode?.removeChild(this._hintEl);
    this._hintEl = null;
    super.dispose();
  }
}
