/**
 * RegionSystem.js — Aethoria v0.6
 *
 * Defines 5 named regions mapped onto the 256×256 world tile grid.
 * Detects which region the player is currently in and fires events
 * when they cross a boundary.
 *
 * Regions (centre = tile 128,128 = map centre = Hearthmoor):
 *   HEARTHMOOR   — the village and its immediate surroundings
 *   ELANDOR      — rolling plains north and west
 *   WHISPERING   — fog-shrouded marshlands south-east
 *   ASHVEIL      — volcanic highlands in the far north-east
 *   SHATTERED    — coastal cliffs far south
 *
 * Also provides:
 *   getRegionAt(tx, tz)     → region object
 *   update(playerPos)       → call each frame; emits 'regionEntered'
 *   getHazards(regionId)    → { nightMultiplier, enemyScaleMult }
 *   serialize/deserialize   → for save system
 */

import { AIMemory } from './AIMemory.js';

// ── Region definitions ────────────────────────────────────────────────────────

export const REGIONS = {
  HEARTHMOOR: {
    id:          'HEARTHMOOR',
    name:        'Hearthmoor',
    subtitle:    'The Last Village',
    color:       '#ffd700',
    cssGlow:     '0,200,80',
    desc:        'The last safe settlement in central Aethoria, sealed from the Void by Elder Lyra\'s ancient pact.',
    ambience:    'day',
    hazards:     { nightMult: 1.2,  enemyScale: 0.9  },
    music:       'day',
    entryMsg:    'You are back within the protection of Hearthmoor.',
  },
  ELANDOR: {
    id:          'ELANDOR',
    name:        'Elandor Plains',
    subtitle:    'The Breadbasket of Aethoria',
    color:       '#88dd44',
    cssGlow:     '80,200,40',
    desc:        'Rolling grasslands dotted with the ruins of farming villages. Bandits and goblins roam the old trade roads.',
    ambience:    'day',
    hazards:     { nightMult: 1.5,  enemyScale: 1.0  },
    music:       'day',
    entryMsg:    'You enter the Elandor Plains. Stay alert — bandits own these roads.',
  },
  WHISPERING: {
    id:          'WHISPERING',
    name:        'Whispering Marshes',
    subtitle:    'Where Spirits Linger',
    color:       '#44ccaa',
    cssGlow:     '40,180,150',
    desc:        'Fog-shrouded wetlands where rare herbs grow and travellers vanish following ghostly lights.',
    ambience:    'night',
    hazards:     { nightMult: 2.0,  enemyScale: 1.2  },
    music:       'night',
    entryMsg:    'The fog thickens. You have entered the Whispering Marshes.',
  },
  ASHVEIL: {
    id:          'ASHVEIL',
    name:        'Ashveil Peaks',
    subtitle:    'Volcanic Highlands',
    color:       '#ff6633',
    cssGlow:     '220,80,20',
    desc:        'Volcanic mountains scarred by ancient eruptions. Dwarven ruins whisper of a forgotten prophecy. Enemies are stronger here.',
    ambience:    'storm',
    hazards:     { nightMult: 2.5,  enemyScale: 1.5  },
    music:       'night',
    entryMsg:    'The ground trembles beneath you. You have entered the Ashveil Peaks.',
  },
  SHATTERED: {
    id:          'SHATTERED',
    name:        'Shattered Coast',
    subtitle:    'The Edge of the World',
    color:       '#4488ff',
    cssGlow:     '40,100,220',
    desc:        'Jagged cliffs battered by relentless waves. Ancient sea temples lie half-submerged. Pirates and spectral ships patrol these waters.',
    ambience:    'storm',
    hazards:     { nightMult: 2.2,  enemyScale: 1.3  },
    music:       'night',
    entryMsg:    'Salt wind cuts to the bone. You have reached the Shattered Coast.',
  },
};

// ── Region boundary definitions (tile coordinate ranges on 256×256 map) ───────
// Centre = 128,128 = Hearthmoor

const REGION_ZONES = [
  { id: 'HEARTHMOOR', cx: 128, cz: 128, radius: 22  },   // tight circle around town
  { id: 'ELANDOR',    cx:  80, cz:  80, radius: 55  },   // NW quadrant plains
  { id: 'WHISPERING', cx: 170, cz: 170, radius: 45  },   // SE quadrant marshes
  { id: 'ASHVEIL',    cx: 190, cz:  60, radius: 40  },   // NE volcanic peaks
  { id: 'SHATTERED',  cx:  70, cz: 200, radius: 40  },   // SW coastal cliffs
];

// ── RegionSystem ──────────────────────────────────────────────────────────────

export class RegionSystem {
  constructor(eventBus) {
    this._bus          = eventBus;
    this._current      = null;
    this._visited      = new Set();
    this._checkTimer   = 0;
    this._checkInterval = 2.0;  // check every 2 seconds (not every frame)
  }

  // ── Region detection ───────────────────────────────────────────────────────

  /**
   * Returns the region object for the given tile position.
   * Falls back to ELANDOR if outside all defined zones.
   */
  getRegionAt(tx, tz) {
    let best = null;
    let bestDist = Infinity;

    for (const zone of REGION_ZONES) {
      const dx   = tx - zone.cx;
      const dz   = tz - zone.cz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < zone.radius && dist < bestDist) {
        best     = zone.id;
        bestDist = dist;
      }
    }

    return REGIONS[best ?? 'ELANDOR'];
  }

  /**
   * Call each frame with player world position.
   * Emits 'regionEntered' when player crosses a boundary.
   * @param {{ x: number, z: number }} playerPos
   * @param {number} delta  seconds
   */
  update(playerPos, delta) {
    this._checkTimer -= delta;
    if (this._checkTimer > 0) return;
    this._checkTimer = this._checkInterval;

    const tx     = Math.floor(playerPos.x);
    const tz     = Math.floor(playerPos.z);
    const region = this.getRegionAt(tx, tz);

    if (!this._current || this._current.id !== region.id) {
      const prev     = this._current;
      this._current  = region;
      const firstVisit = !this._visited.has(region.id);
      this._visited.add(region.id);

      this._bus?.emit('regionEntered', {
        region,
        prev,
        firstVisit,
      });

      AIMemory.recordEvent('region', region.name);
    }
  }

  /** Returns the player's current region (or null before first update). */
  getCurrent() { return this._current; }

  /** Returns an array of all visited region IDs. */
  getVisited() { return [...this._visited]; }

  /** Hazard modifiers for the current region. */
  getCurrentHazards() {
    return this._current?.hazards ?? { nightMult: 1.0, enemyScale: 1.0 };
  }

  // ── Serialization ──────────────────────────────────────────────────────────

  serialize()    { return { visited: [...this._visited], current: this._current?.id ?? null }; }
  deserialize(d) {
    if (!d) return;
    this._visited = new Set(d.visited ?? []);
    this._current = d.current ? (REGIONS[d.current] ?? null) : null;
  }
}
