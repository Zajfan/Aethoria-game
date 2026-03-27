/**
 * Enemy3D.js
 * 3D enemy entity for the Aethoria RPG.
 *
 * AI state machine:  IDLE → PATROL → CHASE → ATTACK → DEAD
 * Procedural low-poly models per enemy type (GOBLIN, WOLF, SKELETON, TROLL).
 * Loot is emitted via EventBus as 'spawnLoot' events.
 *
 * Constructor: new Enemy3D(scene3d, x, z, typeKey, eventBus, world3d)
 */

import { THREE }        from '../engine/Renderer.js';
import { Entity3D, PX } from './Entity3D.js';
import { CONFIG }       from '../config.js';

// AI states
const S = Object.freeze({ IDLE: 0, PATROL: 1, CHASE: 2, ATTACK: 3, DEAD: 4 });

// ── Helpers ───────────────────────────────────────────────────────────────

function _mat(color) {
  return new THREE.MeshLambertMaterial({ color });
}

function _box(w, h, d) {
  return new THREE.BoxGeometry(w, h, d);
}

function _randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Enemy3D ───────────────────────────────────────────────────────────────

export class Enemy3D extends Entity3D {
  /**
   * @param {THREE.Scene}  scene3d
   * @param {number}       x         World X (Three.js coords)
   * @param {number}       z         World Z
   * @param {string}       typeKey   Key in CONFIG.ENEMY_TYPES
   * @param {EventBus}     eventBus
   * @param {object|null}  world3d   Optional; exposes isBlocked(tx, tz)
   */
  constructor(scene3d, x, z, typeKey, eventBus, world3d = null) {
    // Resolve data — also accepts BOSS_TYPES keys when extended by Boss3D
    const d = CONFIG.ENEMY_TYPES[typeKey] || CONFIG.ENEMY_TYPES.GOBLIN;
    super(null, d.name); // camera injected later via setCamera()

    this._data   = d;
    this.typeKey = typeKey;
    this.eventBus = eventBus;
    this.world    = world3d;

    // Convert original px/s → world-units/s
    this.stats = {
      hp:    d.hp,
      maxHp: d.hp,
      atk:   d.atk,
      def:   d.def,
      spd:   d.spd * PX,
    };

    this.isDead = false;
    this.state  = S.IDLE;
    this.atkCD  = 0;   // ms
    this.pTimer = 0;   // ms

    this.pDir     = new THREE.Vector3();
    this.spawnPos = new THREE.Vector3(x, 0, z);
    this.position.set(x, 0, z);

    // Detection ranges in world units (1 unit ≈ 16 original pixels)
    this.DETECT = 130 * PX;
    this.ATK_R  =  42 * PX;
    this.LEASH  = 210 * PX;

    this._buildModel(typeKey);
    this.addToScene(scene3d);
  }

  /** Inject camera reference (set by the scene after construction). */
  setCamera(camera) {
    this.camera = camera;
  }

  // ── Model builders ────────────────────────────────────────────────────────

  _buildModel(typeKey) {
    // Discard any previous meshes (Boss3D calls this before building its own)
    while (this.group.children.length) {
      this.group.remove(this.group.children[0]);
    }
    switch (typeKey) {
      case 'GOBLIN':   this._buildGoblin();   break;
      case 'WOLF':     this._buildWolf();     break;
      case 'SKELETON': this._buildSkeleton(); break;
      case 'TROLL':    this._buildTroll();    break;
      case 'ARCHER':    this._buildArcher();    break;
      case 'SPIDER':    this._buildSpider();    break;
      case 'BANDIT':    this._buildBandit();    break;
      case 'WRAITH':    this._buildWraith();    break;
      case 'GOLEM':     this._buildGolem();     break;
      case 'CULTIST':   this._buildCultist();   break;
      case 'DRAKE':     this._buildDrake();     break;
      case 'LICH':      this._buildLich();      break;
      case 'BERSERKER': this._buildBerserker(); break;
      case 'PHANTOM':   this._buildPhantom();   break;
      default:          this._buildGoblin();
    }
  }

  _buildGoblin() {
    const green = _mat(0x4caf50);
    const dark  = _mat(0x2e7d32);
    const add   = (geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      this.group.add(m);
    };

    add(_box(0.40, 0.55, 0.28), green,  0,     0.60, 0); // torso
    add(_box(0.35, 0.28, 0.30), green,  0,     0.88, 0); // lower head
    add(_box(0.14, 0.38, 0.14), dark,  -0.27,  0.55, 0); // left arm
    add(_box(0.14, 0.38, 0.14), dark,   0.27,  0.55, 0); // right arm
    add(_box(0.16, 0.38, 0.16), dark,  -0.13,  0.20, 0); // left leg
    add(_box(0.16, 0.38, 0.16), dark,   0.13,  0.20, 0); // right leg

    // Pointed cone head
    const coneGeo = new THREE.ConeGeometry(0.22, 0.40, 6);
    const cone    = new THREE.Mesh(coneGeo, green);
    cone.position.set(0, 1.07, 0);
    cone.castShadow = true;
    this.group.add(cone);

    this.group.scale.setScalar(0.7);
  }

  _buildWolf() {
    const grey = _mat(0xaaaaaa);
    const dark = _mat(0x666666);
    const add  = (geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      this.group.add(m);
      return m;
    };

    add(_box(0.90, 0.50, 0.50), grey,  0,     0.60,  0); // body (wide, low)
    add(_box(0.42, 0.38, 0.42), grey,  0.55,  0.72,  0); // head
    add(_box(0.22, 0.20, 0.26), dark,  0.78,  0.62,  0); // snout

    // Triangular ears (ConeGeometry)
    const earGeo = new THREE.ConeGeometry(0.10, 0.22, 4);
    const earL   = new THREE.Mesh(earGeo, grey);
    earL.position.set(0.46, 1.02,  0.14);
    earL.castShadow = true;
    this.group.add(earL);
    const earR = new THREE.Mesh(earGeo, grey);
    earR.position.set(0.46, 1.02, -0.14);
    earR.castShadow = true;
    this.group.add(earR);

    // Four legs
    add(_box(0.18, 0.44, 0.18), dark, -0.30, 0.25,  0.18);
    add(_box(0.18, 0.44, 0.18), dark, -0.30, 0.25, -0.18);
    add(_box(0.18, 0.44, 0.18), dark,  0.30, 0.25,  0.18);
    add(_box(0.18, 0.44, 0.18), dark,  0.30, 0.25, -0.18);

    // Tail
    const tail = new THREE.Mesh(_box(0.12, 0.50, 0.12), grey);
    tail.position.set(-0.50, 0.85, 0);
    tail.rotation.z = 0.7;
    tail.castShadow = true;
    this.group.add(tail);
  }

  _buildSkeleton() {
    const bone  = _mat(0xeeeecc);
    const ivory = _mat(0xbbbbaa);
    const dark  = _mat(0x222222);
    const add   = (geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      this.group.add(m);
    };

    add(_box(0.42, 0.65, 0.22), bone,  0,     0.95,  0); // thin torso
    add(_box(0.36, 0.36, 0.36), bone,  0,     1.52,  0); // skull
    add(_box(0.14, 0.55, 0.14), ivory,-0.32,  0.92,  0); // left arm
    add(_box(0.14, 0.55, 0.14), ivory, 0.32,  0.92,  0); // right arm
    add(_box(0.16, 0.50, 0.16), bone, -0.13,  0.32,  0); // left leg
    add(_box(0.16, 0.50, 0.16), bone,  0.13,  0.32,  0); // right leg
    // Eye sockets
    add(_box(0.08, 0.08, 0.08), dark, -0.10,  1.56,  0.20);
    add(_box(0.08, 0.08, 0.08), dark,  0.10,  1.56,  0.20);
  }

  _buildTroll() {
    const brown = _mat(0x8d6e3a);
    const dark  = _mat(0x5d4037);
    const add   = (geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      this.group.add(m);
    };

    add(_box(0.80, 0.90, 0.55), brown,  0,     1.00, 0); // stocky torso
    add(_box(0.55, 0.55, 0.55), brown,  0,     1.70, 0); // head
    add(_box(0.32, 0.72, 0.30), dark,  -0.58,  1.00, 0); // left arm (thick)
    add(_box(0.32, 0.72, 0.30), dark,   0.58,  1.00, 0); // right arm
    add(_box(0.34, 0.65, 0.32), brown, -0.22,  0.35, 0); // left leg
    add(_box(0.34, 0.65, 0.32), brown,  0.22,  0.35, 0); // right leg

    this.group.scale.setScalar(1.4);
  }

  _buildArcher() {
    const bone  = _mat(0xddddaa);
    const dark  = _mat(0xbbbb88);
    const brown = _mat(0x6b3a2a);
    const add   = (geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat); m.position.set(x,y,z); m.castShadow=true; this.group.add(m);
    };
    // Skeleton body
    add(_box(0.38, 0.60, 0.20), bone,  0,     0.95, 0); // torso
    add(_box(0.34, 0.34, 0.34), bone,  0,     1.52, 0); // skull
    add(_box(0.12, 0.50, 0.12), bone, -0.28,  0.92, 0); // left arm
    add(_box(0.12, 0.50, 0.12), bone,  0.28,  0.92, 0); // right arm
    add(_box(0.14, 0.48, 0.14), bone, -0.11,  0.30, 0); // left leg
    add(_box(0.14, 0.48, 0.14), bone,  0.11,  0.30, 0); // right leg
    // Eye sockets
    add(_box(0.07,0.07,0.07), _mat(0x111111), -0.09, 1.56, 0.19);
    add(_box(0.07,0.07,0.07), _mat(0x111111),  0.09, 1.56, 0.19);
    // Bow (vertical bar + string visual)
    add(_box(0.06, 0.75, 0.06), brown, -0.40, 0.90, 0.08);
    this.group.scale.setScalar(0.85);
    // Ranged setup
    this._isRanged = true;
    this._projectileCD = 0;
  }

  _buildSpider() {
    const black = _mat(0x111111);
    const dark  = _mat(0x222222);
    const red   = _mat(0xcc2222);
    const add   = (geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat); m.position.set(x,y,z); m.castShadow=true; this.group.add(m);
    };
    add(_box(0.55, 0.30, 0.55), black,  0,    0.28, 0); // abdomen
    add(_box(0.32, 0.24, 0.32), dark,   0.38, 0.30, 0); // head
    // Red eyes
    add(_box(0.06,0.06,0.06), red,  0.52, 0.38,  0.14);
    add(_box(0.06,0.06,0.06), red,  0.52, 0.38, -0.14);
    add(_box(0.06,0.06,0.06), red,  0.50, 0.38,  0.07);
    add(_box(0.06,0.06,0.06), red,  0.50, 0.38, -0.07);
    // 8 legs
    const legAngles = [-0.6,-0.2,0.2,0.6];
    for (const a of legAngles) {
      const leg = new THREE.Mesh(_box(0.08,0.44,0.08), black);
      leg.position.set(-0.32, 0.14, a); leg.rotation.x = a * 0.5;
      this.group.add(leg);
      const leg2 = new THREE.Mesh(_box(0.08,0.44,0.08), black);
      leg2.position.set(0.32, 0.14, a); leg2.rotation.x = a * 0.5;
      this.group.add(leg2);
    }
    this.group.scale.setScalar(0.65);
    this._isPoisonous = true;
  }

  _buildBandit() {
    const brown = _mat(0xaa5522), dark = _mat(0x663311), skin = _mat(0xd4926a);
    const add = (g,m,x,y,z) => { const mesh=new THREE.Mesh(g,m); mesh.position.set(x,y,z); mesh.castShadow=true; this.group.add(mesh); };
    add(_box(0.52,0.70,0.30), brown, 0, 0.95, 0);
    add(_box(0.40,0.40,0.40), skin,  0, 1.55, 0);
    add(_box(0.20,0.60,0.20), dark, -0.38, 0.92, 0);
    add(_box(0.20,0.60,0.20), dark,  0.38, 0.92, 0);
    add(_box(0.24,0.52,0.24), brown,-0.15, 0.32, 0);
    add(_box(0.24,0.52,0.24), brown, 0.15, 0.32, 0);
    // Hood/bandana
    add(_box(0.44,0.14,0.44), dark,  0, 1.48, 0);
    this.group.scale.setScalar(0.95);
  }

  _buildWraith() {
    const purple = _mat(0x6622aa), glow = _mat(0xcc44ff), ghost = new THREE.MeshLambertMaterial({ color:0x8844cc, transparent:true, opacity:0.75 });
    const add = (g,m,x,y,z) => { const mesh=new THREE.Mesh(g,m); mesh.position.set(x,y,z); mesh.castShadow=true; this.group.add(mesh); };
    add(_box(0.50,0.90,0.30), ghost, 0, 0.90, 0);
    add(_box(0.38,0.38,0.38), purple, 0, 1.60, 0);
    add(_box(0.14,0.70,0.14), ghost,-0.35, 0.90, 0);
    add(_box(0.14,0.70,0.14), ghost, 0.35, 0.90, 0);
    // Glowing eyes
    add(_box(0.08,0.08,0.08), glow, -0.10, 1.65, 0.22);
    add(_box(0.08,0.08,0.08), glow,  0.10, 1.65, 0.22);
    // Wispy tail instead of legs
    add(new THREE.ConeGeometry(0.18,0.65,6), ghost, 0, 0.20, 0);
    this._isRanged = true; this._projectileCD = 0;
    this._isEthereal = true;
  }

  _buildGolem() {
    const stone = _mat(0x8888aa), dark = _mat(0x5566aa), crack = _mat(0x333355);
    const add = (g,m,x,y,z) => { const mesh=new THREE.Mesh(g,m); mesh.position.set(x,y,z); mesh.castShadow=true; this.group.add(mesh); };
    add(_box(1.00,0.90,0.70), stone, 0, 1.10, 0);
    add(_box(0.70,0.70,0.70), dark,  0, 1.90, 0);
    add(_box(0.45,0.80,0.45), stone,-0.80, 1.00, 0);
    add(_box(0.45,0.80,0.45), stone, 0.80, 1.00, 0);
    add(_box(0.50,0.75,0.50), stone,-0.30, 0.38, 0);
    add(_box(0.50,0.75,0.50), stone, 0.30, 0.38, 0);
    add(_box(0.16,0.16,0.16), crack, -0.14, 1.92, 0.38);
    add(_box(0.16,0.16,0.16), crack,  0.14, 1.92, 0.38);
    this.group.scale.setScalar(1.3);
  }

  _buildCultist() {
    const robe = _mat(0x330044), hood = _mat(0x220033), glow = _mat(0xcc44ff), skin = _mat(0xe8d8e8);
    const add = (g,m,x,y,z) => { const mesh=new THREE.Mesh(g,m); mesh.position.set(x,y,z); mesh.castShadow=true; this.group.add(mesh); };
    add(_box(0.46,0.80,0.30), robe,  0, 0.90, 0);
    add(_box(0.38,0.42,0.38), hood,  0, 1.56, 0);
    add(_box(0.16,0.65,0.16), robe, -0.36, 0.90, 0);
    add(_box(0.16,0.65,0.16), robe,  0.36, 0.90, 0);
    add(_box(0.08,0.08,0.08), glow, -0.08, 1.62, 0.22);
    add(_box(0.08,0.08,0.08), glow,  0.08, 1.62, 0.22);
    // Staff / orb
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.14,6,6), new THREE.MeshLambertMaterial({color:0xcc44ff,emissive:new THREE.Color(0x660099),emissiveIntensity:0.8}));
    orb.position.set(0.45, 1.30, 0); this.group.add(orb);
    this._isRanged = false; this._voidTouch = true;
  }

  _buildDrake() {
    const red = _mat(0x661100), dark = _mat(0x440800), fire = _mat(0xff4400);
    const add = (g,m,x,y,z) => { const mesh=new THREE.Mesh(g,m); mesh.position.set(x,y,z); mesh.castShadow=true; this.group.add(mesh); };
    add(_box(1.20,0.60,0.80), red,   0,  0.70, 0);
    add(_box(0.60,0.55,0.60), dark,  0.90, 0.80, 0);
    add(_box(0.30,0.20,0.35), red,  1.22, 0.65, 0);
    add(_box(0.70,0.12,0.55), red, -0.20, 1.20, 0);
    add(_box(0.70,0.12,0.55), red,  0.20, 1.20, 0);
    add(_box(0.28,0.55,0.28), dark, -0.45, 0.22, 0.30);
    add(_box(0.28,0.55,0.28), dark,  0.45, 0.22, 0.30);
    add(_box(0.28,0.55,0.28), dark, -0.45, 0.22,-0.30);
    add(_box(0.28,0.55,0.28), dark,  0.45, 0.22,-0.30);
    add(_box(0.08,0.10,0.10), fire,  1.10, 0.90, 0.18);
    add(_box(0.08,0.10,0.10), fire,  1.10, 0.90,-0.18);
    this.group.scale.setScalar(1.1); this._isBurner = true;
  }

  _buildLich() {
    const blue = _mat(0x224488), dark = _mat(0x0a1a33), glow = _mat(0x44aaff), ivory = _mat(0xccddee);
    const add = (g,m,x,y,z) => { const mesh=new THREE.Mesh(g,m); mesh.position.set(x,y,z); mesh.castShadow=true; this.group.add(mesh); };
    add(_box(0.40,0.65,0.22), blue,  0, 0.95, 0);
    add(_box(0.36,0.36,0.36), ivory, 0, 1.52, 0);
    add(_box(0.12,0.55,0.12), dark, -0.30, 0.92, 0);
    add(_box(0.12,0.55,0.12), dark,  0.30, 0.92, 0);
    add(_box(0.14,0.50,0.14), blue, -0.12, 0.32, 0);
    add(_box(0.14,0.50,0.14), blue,  0.12, 0.32, 0);
    add(_box(0.08,0.08,0.10), glow, -0.09, 1.56, 0.20);
    add(_box(0.08,0.08,0.10), glow,  0.09, 1.56, 0.20);
    // Crown
    const crown = new THREE.Mesh(_box(0.42,0.10,0.42), _mat(0x335577));
    crown.position.set(0, 1.74, 0); this.group.add(crown);
    this._isRanged = true; this._voidTouch = true;
  }

  _buildBerserker() {
    const red = _mat(0xaa2200), dark = _mat(0x771100), skin = _mat(0xc87050);
    const add = (g,m,x,y,z) => { const mesh=new THREE.Mesh(g,m); mesh.position.set(x,y,z); mesh.castShadow=true; this.group.add(mesh); };
    add(_box(0.80,0.82,0.50), red,   0, 1.00, 0);
    add(_box(0.56,0.54,0.56), skin,  0, 1.70, 0);
    add(_box(0.36,0.76,0.32), dark, -0.64, 1.00, 0);
    add(_box(0.36,0.76,0.32), dark,  0.64, 1.00, 0);
    add(_box(0.36,0.65,0.36), red,  -0.26, 0.32, 0);
    add(_box(0.36,0.65,0.36), red,   0.26, 0.32, 0);
    // Horned helmet
    const helm = new THREE.Mesh(_box(0.58,0.22,0.58), dark); helm.position.set(0,1.93,0); this.group.add(helm);
    const horn1 = new THREE.Mesh(new THREE.ConeGeometry(0.06,0.35,5), skin); horn1.position.set(-0.22,2.10,0); horn1.rotation.z=0.3; this.group.add(horn1);
    const horn2 = new THREE.Mesh(new THREE.ConeGeometry(0.06,0.35,5), skin); horn2.position.set( 0.22,2.10,0); horn2.rotation.z=-0.3; this.group.add(horn2);
    this.group.scale.setScalar(1.2); this._isBerserker = true;
  }

  _buildPhantom() {
    const teal = new THREE.MeshLambertMaterial({color:0x44aacc, transparent:true, opacity:0.65});
    const bright = _mat(0x88ddff);
    const add = (g,m,x,y,z) => { const mesh=new THREE.Mesh(g,m); mesh.position.set(x,y,z); mesh.castShadow=false; this.group.add(mesh); };
    add(_box(0.44,0.80,0.28), teal,  0, 0.80, 0);
    add(new THREE.SphereGeometry(0.24,8,6), teal, 0, 1.55, 0);
    add(_box(0.12,0.60,0.12), teal, -0.32, 0.82, 0);
    add(_box(0.12,0.60,0.12), teal,  0.32, 0.82, 0);
    add(_box(0.08,0.10,0.08), bright,-0.08, 1.60, 0.26);
    add(_box(0.08,0.10,0.08), bright, 0.08, 1.60, 0.26);
    // Wispy tail
    add(new THREE.ConeGeometry(0.15,0.55,5), teal, 0, 0.20, 0);
    this._isEthereal = true;
  }

  // ── AI update ─────────────────────────────────────────────────────────────

  /**
   * @param {number}        delta   Seconds since last frame
   * @param {Entity3D|null} player  Player entity for distance checks
   */
  update(delta, player) {
    if (this.isDead) {
      this._tickFade(delta);
      return;
    }

    const deltaMs = delta * 1000;
    this.atkCD = Math.max(0, this.atkCD - deltaMs);

    const dp = player ? this.position.distanceTo(player.position) : Infinity;
    const ds = this.position.distanceTo(this.spawnPos);

    switch (this.state) {
      case S.IDLE:
        this.velocity.set(0, 0, 0);
        this.pTimer -= deltaMs;
        if (this.pTimer <= 0) {
          this.state  = S.PATROL;
          this.pTimer = _randInt(2200, 4500);
          const angle = Math.random() * Math.PI * 2;
          this.pDir.set(Math.cos(angle), 0, Math.sin(angle));
        }
        if (dp < this.DETECT) this.state = S.CHASE;
        break;

      case S.PATROL:
        this.velocity.copy(this.pDir).multiplyScalar(this.stats.spd * 0.45);
        this.pTimer -= deltaMs;
        if (this.pTimer <= 0) { this.state = S.IDLE; this.pTimer = 1200; }
        if (dp < this.DETECT) this.state = S.CHASE;
        if (ds > 75 * PX)     { this.state = S.IDLE; this.pTimer = 800; }
        break;

      case S.CHASE:
        if (dp > this.LEASH || ds > this.LEASH) {
          this.state = S.IDLE;
          this.pTimer = 800;
          break;
        }
        // ARCHER: stop and shoot at range, don't close to melee
        if (this._isRanged) {
          const SHOOT_R = (this._data.range ?? 180) / 16;
          if (dp <= SHOOT_R) {
            this.state = S.ATTACK;
            this.velocity.set(0,0,0);
            break;
          }
        } else if (dp <= this.ATK_R) { this.state = S.ATTACK; break; }
        if (player) {
          const dir = new THREE.Vector3()
            .subVectors(player.position, this.position)
            .setY(0)
            .normalize();
          this.velocity.copy(dir).multiplyScalar(this.stats.spd);
        }
        break;

      case S.ATTACK:
        this.velocity.set(0, 0, 0);

        // Berserker — speed up below 40% HP
        if (this._isBerserker && this.stats.hp < this.stats.maxHp * 0.4) {
          this.stats.spd = this._data.spd * 1.6 / 16;
        }

        if (this._isRanged) {
          const SHOOT_R = (this._data.range ?? 180) / 16;
          if (dp > SHOOT_R + 1.5) { this.state = S.CHASE; break; }
          if (this.atkCD === 0 && player) {
            const dmg = Math.max(1, this.stats.atk + _randInt(-1, 2));
            player.takeDamage(dmg);
            this.atkCD = 2200; // slower reload
            this.eventBus.emit('damage', this.position.x, this.position.y, dmg, '#ddddaa');
            // Arrow particle
            this.eventBus.emit('arrowShot', {
              fromX: this.position.x, fromZ: this.position.z,
              toX: player.position.x, toZ: player.position.z,
            });
          }
        } else {
          if (dp > this.ATK_R + 0.75) { this.state = S.CHASE; break; }
          if (this.atkCD === 0 && player) {
            const dmg = Math.max(1, this.stats.atk + _randInt(-2, 2));
            player.takeDamage(dmg);
            this.atkCD = this._isPoisonous ? 900 : this._isBerserker ? 800 : 1300;
            this.eventBus.emit('damage', this.position.x, this.position.y, dmg, '#ffcc00');
            if (this._isPoisonous)  this.eventBus.emit('enemyPoisonHit',   { target: player });
            if (this._voidTouch)    this.eventBus.emit('enemyVoidHit',     { target: player });
            if (this._isBurner)     this.eventBus.emit('enemyBurnHit',     { target: player });
          }
        }
        break;
    }

    // Face direction of travel
    const spd2 = Math.hypot(this.velocity.x, this.velocity.z);
    if (spd2 > 0.05) {
      this.group.rotation.y = Math.atan2(this.velocity.x, this.velocity.z);
    }

    this.position.addScaledVector(this.velocity, delta);
    // v0.5 — snap Y to terrain heightmap
    if (this.world?.getGroundY) {
      this.position.y = this.world.getGroundY(
        Math.floor(this.position.x), Math.floor(this.position.z)
      );
    } else {
      this.position.y = 0;
    }
    this.group.position.copy(this.position);
    this._updateLabelPosition();
  }

  // ── Combat ────────────────────────────────────────────────────────────────

  takeDamage(amount, attacker) {
    if (this.isDead) return;
    this.stats.hp = Math.max(0, this.stats.hp - amount);
    this.eventBus.emit('damage', this.position.x, this.position.y, amount, '#ffcc00');
    this.state = S.CHASE;
    if (this.stats.hp <= 0) this._die(attacker);
  }

  _die(killer) {
    this.isDead = true;
    this.state  = S.DEAD;
    this.velocity.set(0, 0, 0);

    // v0.4 — death explosion particle effect
    const deathColor = this._data.color ?? 0xff4400;
    this.eventBus.emit('enemyDeath', {
      x: this.position.x, y: 0.5, z: this.position.z, color: deathColor,
    });

    // Track kills for quest and faction systems
    this.eventBus.emit('enemyKilled', { typeKey: this.typeKey, name: this._data.name });

    // Loot drops — emit events, let the scene handle spawn
    for (const itemKey of (this._data.loot || [])) {
      if (Math.random() > 0.38) {
        this.eventBus.emit('spawnLoot', {
          x:       this.position.x + (Math.random() - 0.5) * 2.25,
          y:       0,
          z:       this.position.z + (Math.random() - 0.5) * 2.25,
          itemKey,
        });
      }
    }

    // Clear player's attack target
    if (killer?.attackTarget === this) killer.attackTarget = null;
    // Award XP
    if (killer) killer.gainXP(this._data.xp);

    // Fade out then schedule respawn
    this._startFade(0.9, () => {
      if (this._labelEl) this._labelEl.style.display = 'none';
      setTimeout(() => this._respawn(), 18_000);
    });
  }

  _respawn() {
    if (!this._scene) return;

    this.stats.hp = this.stats.maxHp;
    this.isDead   = false;
    this.state    = S.IDLE;
    this.pTimer   = 0;

    this.position.copy(this.spawnPos);
    this.group.position.copy(this.position);

    // Restore opacity
    this._fadeAlpha = 1;
    this.group.traverse(obj => {
      if (obj.isMesh && obj.material) {
        obj.material.opacity     = 1;
        obj.material.transparent = false;
      }
    });

    if (this._labelEl) this._labelEl.style.display = 'block';
  }
}
