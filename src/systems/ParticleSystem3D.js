/**
 * ParticleSystem3D.js
 * Aethoria v0.4 — Particle & Visual Effects Engine
 *
 * Provides pooled, GPU-friendly particle effects using Three.js Points and
 * procedurally animated meshes. No external dependencies.
 *
 * Effect catalogue
 * ─────────────────
 *  hitSpark(x,y,z, color)         – combat hit burst
 *  healBurst(x,y,z)               – green healing wisps
 *  deathExplosion(x,y,z, color)   – enemy death shatter
 *  fireballTrail(x,y,z)           – mage fireball glow
 *  slamShockwave(x,y,z, radius)   – warrior AoE ring
 *  levelUpBurst(x,y,z)            – level-up column of light
 *  lootGlow(x,y,z, color)         – loot pickup shimmer
 *  dustCloud(x,y,z)               – footstep dust puff
 *  weatherTick(delta)             – rain / fog particles
 *  ambientUpdate(delta)           – fireflies / floating motes
 *
 * Usage
 * ──────
 *   const fx = new ParticleSystem3D(scene3d);
 *   fx.hitSpark(px, py, pz, 0xffffff);
 *   // in game loop:
 *   fx.update(delta);
 */

import { THREE } from '../engine/Renderer.js';

// ── Constants ────────────────────────────────────────────────────────────────

const UP      = new THREE.Vector3(0, 1, 0);
const GRAVITY = -9.8;

// ── Helpers ──────────────────────────────────────────────────────────────────

function rand(min, max)     { return min + Math.random() * (max - min); }
function randVec3(scale)    { return new THREE.Vector3(rand(-1,1), rand(-1,1), rand(-1,1)).normalize().multiplyScalar(scale); }
function color3(hex)        { return new THREE.Color(hex); }

// ── Single particle record (used in pools) ───────────────────────────────────

class Particle {
  constructor() {
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.life     = 0;
    this.maxLife  = 1;
    this.size     = 1;
    this.color    = new THREE.Color(1, 1, 1);
    this.alpha    = 1;
    this.active   = false;
    // index into the geometry attribute arrays
    this._idx     = 0;
  }

  get t() { return Math.max(0, 1 - this.life / this.maxLife); } // 0=new, 1=dead
}

// ── Pooled Points-based emitter ───────────────────────────────────────────────

class PointEmitter {
  /**
   * @param {THREE.Scene} scene
   * @param {number}      maxParticles
   * @param {THREE.Texture|null} texture
   */
  constructor(scene, maxParticles, texture = null) {
    this._scene    = scene;
    this._pool     = Array.from({ length: maxParticles }, (_, i) => {
      const p = new Particle();
      p._idx = i;
      return p;
    });
    this._active   = [];

    // Build geometry with position + color + alpha attributes
    this._geo = new THREE.BufferGeometry();

    const pos    = new Float32Array(maxParticles * 3);
    const col    = new Float32Array(maxParticles * 3);
    const sizes  = new Float32Array(maxParticles);
    const alphas = new Float32Array(maxParticles);

    this._geo.setAttribute('position',      new THREE.BufferAttribute(pos,   3));
    this._geo.setAttribute('customColor',   new THREE.BufferAttribute(col,   3));
    this._geo.setAttribute('size',          new THREE.BufferAttribute(sizes, 1));
    this._geo.setAttribute('alpha',         new THREE.BufferAttribute(alphas,1));

    // Custom shader material for per-particle alpha and size
    this._mat = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: texture || this._makeDefaultTex() },
      },
      vertexShader: `
        attribute float size;
        attribute vec3  customColor;
        attribute float alpha;
        varying   vec3  vColor;
        varying   float vAlpha;
        void main() {
          vColor    = customColor;
          vAlpha    = alpha;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (200.0 / -mvPos.z);
          gl_Position  = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        varying vec3  vColor;
        varying float vAlpha;
        void main() {
          vec4 tex   = texture2D(uTexture, gl_PointCoord);
          if (tex.a * vAlpha < 0.01) discard;
          gl_FragColor = vec4(vColor, 1.0) * vec4(1.0, 1.0, 1.0, tex.a * vAlpha);
        }
      `,
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    });

    this._points = new THREE.Points(this._geo, this._mat);
    this._points.frustumCulled = false;
    scene.add(this._points);
  }

  _makeDefaultTex() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width  = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const grd = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    grd.addColorStop(0,   'rgba(255,255,255,1)');
    grd.addColorStop(0.4, 'rgba(255,255,255,0.6)');
    grd.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  /** Fetch a free particle from the pool, or null if pool exhausted. */
  _alloc() {
    for (const p of this._pool) {
      if (!p.active) {
        p.active = true;
        this._active.push(p);
        return p;
      }
    }
    return null;
  }

  /**
   * Spawn a batch of particles.
   * @param {object} cfg
   * @param {THREE.Vector3} cfg.origin
   * @param {number}        cfg.count
   * @param {number}        cfg.color
   * @param {number}        cfg.sizeMin
   * @param {number}        cfg.sizeMax
   * @param {number}        cfg.lifeMin
   * @param {number}        cfg.lifeMax
   * @param {number}        cfg.speedMin
   * @param {number}        cfg.speedMax
   * @param {boolean}       [cfg.gravity]
   * @param {THREE.Vector3} [cfg.dir]     If set, biases direction
   * @param {number}        [cfg.spread]  Angle spread in radians (0=perfectly directed)
   */
  emit(cfg) {
    for (let i = 0; i < cfg.count; i++) {
      const p = this._alloc();
      if (!p) return;

      p.position.copy(cfg.origin);
      p.life    = cfg.lifeMin + Math.random() * (cfg.lifeMax - cfg.lifeMin);
      p.maxLife = p.life;
      p.size    = cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin);
      p.color.set(cfg.color);
      p.alpha   = 1;
      p._gravity = cfg.gravity !== false;

      const speed = cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin);
      if (cfg.dir) {
        const spread = cfg.spread ?? Math.PI;
        const v = cfg.dir.clone().normalize();
        const perp = new THREE.Vector3(rand(-1,1), rand(-1,1), rand(-1,1));
        perp.cross(v).normalize();
        const angle = Math.random() * spread;
        p.velocity.copy(v).applyAxisAngle(perp, angle).multiplyScalar(speed);
      } else {
        p.velocity.copy(randVec3(speed));
      }
    }
  }

  /** Called each frame — advance physics, write to GPU buffers. */
  update(delta) {
    const posAttr   = this._geo.attributes.position;
    const colAttr   = this._geo.attributes.customColor;
    const sizeAttr  = this._geo.attributes.size;
    const alphaAttr = this._geo.attributes.alpha;

    for (let i = this._active.length - 1; i >= 0; i--) {
      const p = this._active[i];
      p.life -= delta;
      if (p.life <= 0) {
        // Hide dead particle off-screen
        posAttr.setXYZ(p._idx, 0, -9999, 0);
        alphaAttr.setX(p._idx, 0);
        p.active = false;
        this._active.splice(i, 1);
        continue;
      }

      if (p._gravity) p.velocity.y += GRAVITY * delta * 0.25;
      p.position.addScaledVector(p.velocity, delta);

      const t = p.t; // 0=new … 1=dead
      const a = Math.sin(t * Math.PI); // ramp up then down

      posAttr.setXYZ(p._idx, p.position.x, p.position.y, p.position.z);
      colAttr.setXYZ(p._idx, p.color.r, p.color.g, p.color.b);
      sizeAttr.setX(p._idx, p.size * (1 - t * 0.5));
      alphaAttr.setX(p._idx, a);
    }

    posAttr.needsUpdate   = true;
    colAttr.needsUpdate   = true;
    sizeAttr.needsUpdate  = true;
    alphaAttr.needsUpdate = true;
  }

  dispose() {
    this._scene.remove(this._points);
    this._geo.dispose();
    this._mat.dispose();
  }
}

// ── Mesh-based ring (for shockwaves) ─────────────────────────────────────────

class ShockwaveRing {
  constructor(scene, x, y, z, targetRadius, color) {
    this._scene  = scene;
    this._life   = 0;
    this._maxLife = 0.55;
    this._target = targetRadius;
    this.done    = false;

    const geo = new THREE.RingGeometry(0, 0.05, 32);
    const mat = new THREE.MeshBasicMaterial({
      color:       color,
      transparent: true,
      opacity:     0.85,
      side:        THREE.DoubleSide,
      depthWrite:  false,
    });
    this._mesh = new THREE.Mesh(geo, mat);
    this._mesh.rotation.x = -Math.PI / 2;
    this._mesh.position.set(x, y + 0.05, z);
    scene.add(this._mesh);
  }

  update(delta) {
    this._life += delta;
    const t  = this._life / this._maxLife;
    if (t >= 1) { this.done = true; return; }

    const r = this._target * t;
    this._mesh.geometry.dispose();
    this._mesh.geometry = new THREE.RingGeometry(r * 0.75, r, 32);
    this._mesh.material.opacity = (1 - t) * 0.8;
  }

  dispose() {
    this._scene.remove(this._mesh);
    this._mesh.geometry.dispose();
    this._mesh.material.dispose();
  }
}

// ── Floating text pop (damage numbers) ───────────────────────────────────────

class FloatingLabel {
  constructor(scene, camera, x, y, z, text, color) {
    this._scene   = scene;
    this._camera  = camera;
    this._life    = 1.2;
    this._maxLife = 1.2;
    this.done     = false;
    this._pos     = new THREE.Vector3(x, y, z);
    this._vel     = new THREE.Vector3(rand(-0.4,0.4), 2.5, rand(-0.4,0.4));

    // Create DOM label
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed; pointer-events:none; z-index:9000;
      font-family:'Courier New',monospace; font-weight:bold;
      font-size:15px; color:${color};
      text-shadow: 0 0 6px ${color}, 1px 1px 2px #000;
      white-space:nowrap; transition:none;
    `;
    el.textContent = text;
    document.body.appendChild(el);
    this._el = el;
  }

  update(delta, projFn) {
    this._life -= delta;
    if (this._life <= 0) { this.done = true; return; }

    this._pos.addScaledVector(this._vel, delta);
    this._vel.y -= 4 * delta; // light gravity

    const t = 1 - this._life / this._maxLife;
    this._el.style.opacity = (1 - t * t).toFixed(3);
    this._el.style.transform = `scale(${1 + t * 0.3})`;

    // Project 3D → screen
    const screen = projFn(this._pos);
    if (screen) {
      this._el.style.left = (screen.x - this._el.offsetWidth  / 2) + 'px';
      this._el.style.top  = (screen.y - this._el.offsetHeight / 2) + 'px';
      this._el.style.display = 'block';
    } else {
      this._el.style.display = 'none';
    }
  }

  dispose() {
    this._el.remove();
  }
}

// ── Ambient firefly emitter ───────────────────────────────────────────────────

class Firefly {
  constructor(scene, cx, cz, range) {
    this._scene = scene;
    this._cx = cx; this._cz = cz; this._range = range;
    this._t   = Math.random() * Math.PI * 2;
    this._speed = rand(0.3, 1.1);
    this._orbitR = rand(1.5, 5.0);
    this._height = rand(0.5, 2.0);
    this._color  = new THREE.Color().setHSL(rand(0.05, 0.18), 1, 0.8);

    const geo = new THREE.SphereGeometry(0.05, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ color: this._color, transparent: true });
    this._mesh = new THREE.Mesh(geo, mat);
    scene.add(this._mesh);

    // Glow halo
    const gGeo = new THREE.SphereGeometry(0.14, 6, 6);
    const gMat = new THREE.MeshBasicMaterial({
      color: this._color, transparent: true, opacity: 0.25,
    });
    this._glow = new THREE.Mesh(gGeo, gMat);
    this._mesh.add(this._glow);
  }

  update(delta) {
    this._t += delta * this._speed;
    const x = this._cx + Math.cos(this._t) * this._orbitR + rand(-0.02, 0.02);
    const z = this._cz + Math.sin(this._t * 0.7) * this._orbitR + rand(-0.02, 0.02);
    const y = this._height + Math.sin(this._t * 1.3) * 0.3;
    this._mesh.position.set(x, y, z);

    const flicker = 0.6 + 0.4 * Math.sin(this._t * 7);
    this._mesh.material.opacity = flicker;
    this._glow.material.opacity = flicker * 0.25;
  }

  dispose() {
    this._scene.remove(this._mesh);
    this._mesh.geometry.dispose();
    this._mesh.material.dispose();
  }
}

// ── Rain system ───────────────────────────────────────────────────────────────

class RainSystem {
  constructor(scene) {
    this._scene  = scene;
    this._active = false;

    const COUNT  = 1800;
    const geo    = new THREE.BufferGeometry();
    const pos    = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      pos[i*3]   = rand(-20, 20);
      pos[i*3+1] = rand(0, 12);
      pos[i*3+2] = rand(-20, 20);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat  = new THREE.PointsMaterial({
      color:       0x88ccff,
      size:        0.06,
      transparent: true,
      opacity:     0.55,
      depthWrite:  false,
    });
    this._points = new THREE.Points(geo, mat);
    this._points.frustumCulled = false;
    this._points.visible = false;
    scene.add(this._points);
    this._pos = pos;
  }

  setActive(on) {
    this._active = on;
    this._points.visible = on;
  }

  follow(px, pz) {
    this._points.position.set(px, 0, pz);
  }

  update(delta) {
    if (!this._active) return;
    const pos = this._pos;
    const len = pos.length / 3;
    for (let i = 0; i < len; i++) {
      pos[i*3+1] -= delta * 14;
      if (pos[i*3+1] < -1) pos[i*3+1] = 12;
    }
    this._points.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this._scene.remove(this._points);
    this._points.geometry.dispose();
    this._points.material.dispose();
  }
}

// ── Main ParticleSystem3D ────────────────────────────────────────────────────

export class ParticleSystem3D {
  /**
   * @param {THREE.Scene}   scene3d
   * @param {THREE.Camera}  camera   For projecting 3D→screen coords
   */
  constructor(scene3d, camera) {
    this._scene   = scene3d;
    this._camera  = camera;

    // Generic emitter pool
    this._emitter = new PointEmitter(scene3d, 2000);

    // Shockwave rings
    this._rings = [];

    // Floating text labels
    this._labels = [];

    // Fireflies (ambient)
    this._fireflies = [];
    this._ffTimer   = 0;

    // Rain
    this._rain = new RainSystem(scene3d);

    // Screen projector helper
    this._projVec = new THREE.Vector3();
  }

  // ── Projection helper ───────────────────────────────────────────────────────

  _project(worldPos) {
    this._projVec.copy(worldPos);
    this._projVec.project(this._camera);
    const w = window.innerWidth;
    const h = window.innerHeight;
    const x = (this._projVec.x *  0.5 + 0.5) * w;
    const y = (this._projVec.y * -0.5 + 0.5) * h;
    if (this._projVec.z > 1) return null; // behind camera
    return { x, y };
  }

  // ── Effect API ───────────────────────────────────────────────────────────────

  /**
   * Sharp white/orange burst on hit.
   * @param {number} x @param {number} y @param {number} z
   * @param {number} [color=0xffffff]
   */
  hitSpark(x, y, z, color = 0xffffff) {
    const origin = new THREE.Vector3(x, y + 0.8, z);
    this._emitter.emit({
      origin, count: 18, color,
      sizeMin: 4, sizeMax: 10,
      lifeMin: 0.15, lifeMax: 0.38,
      speedMin: 2, speedMax: 6,
      gravity: true,
    });
    // Small orange core
    this._emitter.emit({
      origin, count: 6, color: 0xff8800,
      sizeMin: 6, sizeMax: 14,
      lifeMin: 0.08, lifeMax: 0.22,
      speedMin: 1, speedMax: 3,
      gravity: false,
    });
  }

  /**
   * Green healing wisps rising upward.
   */
  healBurst(x, y, z) {
    const origin = new THREE.Vector3(x, y, z);
    const dir    = UP.clone();
    this._emitter.emit({
      origin, count: 24, color: 0x44ff88,
      sizeMin: 6, sizeMax: 14,
      lifeMin: 0.6, lifeMax: 1.1,
      speedMin: 0.5, speedMax: 2.5,
      dir, spread: 1.0, gravity: false,
    });
    // Outer glow ring
    this._emitter.emit({
      origin, count: 10, color: 0xaaffcc,
      sizeMin: 10, sizeMax: 20,
      lifeMin: 0.3, lifeMax: 0.6,
      speedMin: 0.2, speedMax: 0.8,
      gravity: false,
    });
  }

  /**
   * Explosion of shards on enemy death.
   */
  deathExplosion(x, y, z, color = 0xff4400) {
    const origin = new THREE.Vector3(x, y + 0.5, z);
    this._emitter.emit({
      origin, count: 45, color,
      sizeMin: 5, sizeMax: 18,
      lifeMin: 0.4, lifeMax: 0.9,
      speedMin: 2, speedMax: 9,
      gravity: true,
    });
    // Small dark fragments
    this._emitter.emit({
      origin, count: 20, color: 0x222222,
      sizeMin: 3, sizeMax: 8,
      lifeMin: 0.3, lifeMax: 0.7,
      speedMin: 1, speedMax: 5,
      gravity: true,
    });
  }

  /**
   * Mage fireball trail — call each frame while fireball is in flight.
   */
  fireballTrail(x, y, z) {
    const origin = new THREE.Vector3(x, y, z);
    this._emitter.emit({
      origin, count: 5, color: 0xff5500,
      sizeMin: 8, sizeMax: 16,
      lifeMin: 0.15, lifeMax: 0.35,
      speedMin: 0.2, speedMax: 0.8,
      gravity: false,
    });
    this._emitter.emit({
      origin, count: 3, color: 0xffcc00,
      sizeMin: 12, sizeMax: 22,
      lifeMin: 0.1, lifeMax: 0.25,
      speedMin: 0.1, speedMax: 0.4,
      gravity: false,
    });
  }

  /**
   * Warrior slam AoE ring + upward debris.
   */
  slamShockwave(x, y, z, radius) {
    const ring = new ShockwaveRing(this._scene, x, y, z, radius, 0xffaa22);
    this._rings.push(ring);

    const origin = new THREE.Vector3(x, y, z);
    this._emitter.emit({
      origin, count: 30, color: 0xffaa22,
      sizeMin: 4, sizeMax: 12,
      lifeMin: 0.3, lifeMax: 0.7,
      speedMin: radius * 0.8, speedMax: radius * 1.8,
      dir: new THREE.Vector3(0, 1, 0), spread: Math.PI,
      gravity: true,
    });
  }

  /**
   * Level-up column of light.
   */
  levelUpBurst(x, y, z) {
    const origin = new THREE.Vector3(x, y, z);
    // Rising column
    for (let i = 0; i < 3; i++) {
      this._emitter.emit({
        origin: new THREE.Vector3(x, y + i * 0.5, z),
        count: 20, color: 0xffd700,
        sizeMin: 8, sizeMax: 20,
        lifeMin: 0.5, lifeMax: 1.2,
        speedMin: 0.3, speedMax: 1.5,
        dir: UP, spread: 0.6, gravity: false,
      });
    }
    // Outward burst ring
    this._emitter.emit({
      origin, count: 40, color: 0xffffff,
      sizeMin: 6, sizeMax: 16,
      lifeMin: 0.4, lifeMax: 0.8,
      speedMin: 2, speedMax: 6,
      dir: new THREE.Vector3(1, 0, 0), spread: Math.PI,
      gravity: false,
    });
    const ring = new ShockwaveRing(this._scene, x, y, z, 2.5, 0xffd700);
    this._rings.push(ring);
  }

  /**
   * Loot item pickup shimmer.
   */
  lootGlow(x, y, z, color = 0xffd700) {
    const origin = new THREE.Vector3(x, y + 0.3, z);
    this._emitter.emit({
      origin, count: 12, color,
      sizeMin: 8, sizeMax: 16,
      lifeMin: 0.4, lifeMax: 0.9,
      speedMin: 0.3, speedMax: 1.2,
      dir: UP, spread: 0.8, gravity: false,
    });
  }

  /**
   * Footstep dust puff.
   */
  dustCloud(x, y, z) {
    const origin = new THREE.Vector3(x, y + 0.05, z);
    this._emitter.emit({
      origin, count: 6, color: 0xc2b280,
      sizeMin: 5, sizeMax: 12,
      lifeMin: 0.2, lifeMax: 0.45,
      speedMin: 0.2, speedMax: 0.8,
      gravity: false,
    });
  }

  /**
   * Floating damage / heal text.
   * @param {number} x @param {number} y @param {number} z
   * @param {string|number} text
   * @param {string} color  CSS color string
   */
  floatingText(x, y, z, text, color = '#ffffff') {
    const lbl = new FloatingLabel(this._scene, this._camera, x, y + 0.8, z, text, color);
    this._labels.push(lbl);
  }

  /**
   * Void crystal / shard pickup effect.
   */
  shardCollect(x, y, z, color) {
    const origin = new THREE.Vector3(x, y, z);
    const ring1 = new ShockwaveRing(this._scene, x, y, z, 1.5, color);
    const ring2 = new ShockwaveRing(this._scene, x, y, z, 2.8, color);
    this._rings.push(ring1, ring2);

    this._emitter.emit({
      origin, count: 60, color,
      sizeMin: 6, sizeMax: 18,
      lifeMin: 0.5, lifeMax: 1.4,
      speedMin: 1, speedMax: 5,
      gravity: false,
    });
  }

  // ── Weather ─────────────────────────────────────────────────────────────────

  /** Call when weather changes. @param {string} weather */
  setWeather(weather) {
    this._rain.setActive(weather === 'RAIN' || weather === 'STORM');
  }

  /** Follow player for rain. */
  weatherFollow(px, pz) {
    this._rain.follow(px, pz);
  }

  // ── Ambient ─────────────────────────────────────────────────────────────────

  /**
   * Seed fireflies near a point — call once after world loads.
   * @param {number} cx @param {number} cz  Center world position
   * @param {number} count
   */
  seedFireflies(cx, cz, count = 30) {
    for (let i = 0; i < count; i++) {
      const ox = cx + rand(-40, 40);
      const oz = cz + rand(-40, 40);
      this._fireflies.push(new Firefly(this._scene, ox, oz, 60));
    }
  }

  /**
   * Respawn a firefly cluster centered on new player position (called on move).
   */
  updateFireflyCenter(px, pz) {
    if (this._fireflies.length === 0) return;
    // Wander: softly nudge positions toward player
    this._ffTimer++;
    if (this._ffTimer % 480 === 0) {
      // Replace 10 fireflies with new ones near player
      for (let i = 0; i < 10; i++) {
        const old = this._fireflies.shift();
        old.dispose();
        const ox = px + rand(-30, 30);
        const oz = pz + rand(-30, 30);
        this._fireflies.push(new Firefly(this._scene, ox, oz, 60));
      }
    }
  }

  // ── Main update ─────────────────────────────────────────────────────────────

  /** Call once per frame in the game loop. @param {number} delta seconds */
  update(delta) {
    // Point particles
    this._emitter.update(delta);

    // Shockwave rings
    for (let i = this._rings.length - 1; i >= 0; i--) {
      this._rings[i].update(delta);
      if (this._rings[i].done) {
        this._rings[i].dispose();
        this._rings.splice(i, 1);
      }
    }

    // Floating labels
    const projFn = (pos) => this._project(pos);
    for (let i = this._labels.length - 1; i >= 0; i--) {
      this._labels[i].update(delta, projFn);
      if (this._labels[i].done) {
        this._labels[i].dispose();
        this._labels.splice(i, 1);
      }
    }

    // Fireflies
    for (const ff of this._fireflies) ff.update(delta);

    // Rain
    this._rain.update(delta);
  }

  /**
   * Attach to event bus — auto-reacts to game events.
   * @param {EventBus}      bus
   * @param {Player3D|null} player  For position references
   */
  attachToEventBus(bus, player) {
    this._player = player;

    bus.on('damage', (x, _y, val, col) => {
      const y   = player ? player.position.y : 0;
      const css = typeof col === 'string' ? col : '#' + (col >>> 0).toString(16).padStart(6,'0');
      this.floatingText(x, y, player?.position.z ?? 0, val, css);
      if (typeof val === 'number' && val > 0) {
        this.hitSpark(x, y, player?.position.z ?? 0, 0xffffff);
      }
    });

    bus.on('levelUp', (lv) => {
      if (!player) return;
      this.levelUpBurst(player.position.x, player.position.y, player.position.z);
    });

    bus.on('weatherChanged', (w) => this.setWeather(w));

    bus.on('playerSlam', ({ x, z, range }) => {
      this.slamShockwave(x, 0, z, range);
    });

    bus.on('playerFireball', ({ target }) => {
      if (target?.position) {
        this.fireballTrail(target.position.x, target.position.y + 0.5, target.position.z);
        this.hitSpark(target.position.x, target.position.y + 0.5, target.position.z, 0xff5500);
      }
    });
  }

  dispose() {
    this._emitter.dispose();
    this._rings.forEach(r => r.dispose());
    this._labels.forEach(l => l.dispose());
    this._fireflies.forEach(f => f.dispose());
    this._rain.dispose();
  }
}
