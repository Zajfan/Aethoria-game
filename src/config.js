export const CONFIG = {
  TILE_SIZE: 32,
  MAP_WIDTH:  256,
  MAP_HEIGHT: 256,

  // 3D world settings (Three.js units)
  WORLD_3D: {
    TILE_SIZE:      1,    // Three.js units per tile
    CHUNK_SIZE:     16,   // tiles per chunk side
    VIEW_DISTANCE:  5,    // chunk radius to render around player
    PLAYER_HEIGHT:  1.8,  // top of player model
    ENTITY_SCALE:   0.9,  // entity to world scale
  },

  TILES: {
    DEEP_WATER:    1,
    WATER:         2,
    SAND:          3,
    GRASS:         4,
    FOREST:        5,
    STONE:         6,
    DUNGEON_FLOOR: 7,
    DUNGEON_WALL:  8,
    PATH:          9,
    TOWN_FLOOR:    10,
  },

  BLOCKED_TILES: [1, 2, 5, 6, 8],

  PLAYER: {
    BASE_HP:          100,
    BASE_ATTACK:      10,
    BASE_DEFENSE:     5,
    SPEED:            165,
    ATTACK_RANGE:     54,
    ATTACK_COOLDOWN:  850,
    XP_PER_LEVEL:     100,
  },

  ENEMY_TYPES: {
    GOBLIN:   { name:'Goblin',   hp:30,  atk:5,  def:2, xp:25,  spd:58,  color:0x4caf50, sz:12, loot:['gold','gold','herb','sword','silver']       },
    WOLF:     { name:'Wolf',     hp:48,  atk:8,  def:3, xp:38,  spd:78,  color:0xaaaaaa, sz:12, loot:['hide','fang','hide','silver']                  },
    SKELETON: { name:'Skeleton', hp:58,  atk:12, def:5, xp:52,  spd:46,  color:0xeeeecc, sz:12, loot:['bones','sword','bones','gold','scroll']         },
    TROLL:    { name:'Troll',    hp:135, atk:18, def:8, xp:125, spd:36,  color:0x8d6e3a, sz:20, loot:['club','gem','gold','gold','chainmail']          },
  },

  ITEMS: {
    gold:   { name:'Gold Coins',      type:'currency',  value:20 },
    silver: { name:'Silver Coins',    type:'currency',  value:5  },
    sword:  { name:'Iron Sword',      type:'weapon',    atk:6,   value:55  },
    axe:    { name:'Battle Axe',      type:'weapon',    atk:10,  value:95  },
    staff:  { name:'Arcane Staff',    type:'weapon',    atk:8,   value:85  },
    bow:    { name:'Ranger Bow',      type:'weapon',    atk:7,   value:75  },
    shield: { name:'Wood Shield',     type:'armor',     def:3,   value:35  },
    chainmail:{ name:'Chainmail',     type:'armor',     def:6,   value:90  },
    robes:  { name:'Mage Robes',      type:'armor',     def:2,   value:70  },
    leather:{ name:'Leather Armor',   type:'armor',     def:4,   value:60  },
    hide:   { name:'Animal Hide',     type:'material',  value:10 },
    bones:  { name:'Bones',           type:'material',  value:5  },
    fang:   { name:'Wolf Fang',       type:'material',  value:18 },
    gem:    { name:'Gemstone',        type:'material',  value:110 },
    club:   { name:'Troll Club',      type:'weapon',    atk:11,  value:85  },
    herb:   { name:'Healing Herb',    type:'consumable',heal:25, value:22  },
    potion: { name:'Health Potion',   type:'consumable',heal:65, value:65  },
    elixir: { name:'Grand Elixir',    type:'consumable',heal:150,value:140 },
    key:    { name:'Dungeon Key',     type:'material',  value:50 },
    scroll: { name:'Lore Scroll',     type:'readable',  value:30 },
    crystal:{ name:'Void Crystal',   type:'material',  value:180 },
  },

  RECIPES: [
    { result:'potion',   materials:{ herb:2 },                 label:'Brew Health Potion'   },
    { result:'elixir',   materials:{ herb:3, gem:1 },          label:'Brew Grand Elixir'    },
    { result:'shield',   materials:{ bones:3, hide:1 },        label:'Craft Bone Shield'    },
    { result:'chainmail',materials:{ hide:4, bones:2 },        label:'Forge Chainmail'      },
    { result:'leather',  materials:{ hide:3 },                 label:'Craft Leather Armor'  },
  ],

  NPCS_DATA: [
    {
      name:'Elder Lyra', role:'Village Elder', color:0xffd700,
      bio:'The oldest person in Hearthmoor — possibly the oldest in Aethoria. She knows more about the Voidlords than she has ever told anyone. She performed the Sealing that keeps the village alive. She is waiting for someone capable enough to trust with the full truth.',
      hint:'Ask Lyra about the Crystal Crown, the Sealing, or the Voidlords to unlock story content.',
    },
    {
      name:'Gareth', role:'Blacksmith', color:0xff8c00,
      bio:'A soldier-turned-smith who lost his right arm in the Battle of the Ember Road and taught himself to forge left-handed. Gruff because he has buried too many people he cared about. Has spent twenty years building a replica of the Crystal Crown that does not work — he keeps trying.',
      hint:'Gareth gives weapon quests and unlocks crafting upgrades. Bring him boss materials.',
    },
    {
      name:'Mira', role:'Herbalist', color:0x66cc44,
      bio:'Remembers the name of every plant and every patient she has ever had. Does not remember the name of her birth village — the Forgetting took it. Has discovered a herb she calls Nullwort that grows near Void traces. Has not told anyone what it does because she is afraid of the answer.',
      hint:'Mira gives healing quests and unlocks potion crafting. She reacts to world events with medical concern.',
    },
    {
      name:'Dorin', role:'Merchant', color:0xaaaaff,
      bio:'Has visited 43 settlements across Aethoria. 39 of them are gone. Keeps maps of where they were. Has been inside the Void Gate and returned, which should be impossible. Will not explain how. Sometimes reaches for something at his side that is not there.',
      hint:'Dorin sells rare items and gives collection quests. He knows more about the Void than he admits.',
    },
    {
      name:'Capt. Vel', role:'Guard Captain', color:0x4488ff,
      bio:'Held the line at four settlements before Hearthmoor, each of which eventually fell anyway. Not pessimistic — precise. Has a standing order from Lyra she has never spoken aloud. She will follow it. She is still trying to understand why.',
      hint:'Vel gives combat quests and bounties. Talk to her after major kills for story reactions.',
    },
  ],

  WORLD_LORE: `Aethoria is an ancient realm. Three hundred years ago, the Crystal Crown was shattered by the Voidlords — beings from beyond the leylines who were invited here by a scholar who thought they would teach and not consume. She was wrong. The Crown broke into five shards. The kingdoms fell one by one, not to war but to forgetting. Hearthmoor survives because of a Sealing performed by Elder Lyra — an act whose true cost she has never revealed. The five shards must be gathered to restore the Crown and send the Voidlords back. The question no one has asked yet: what did the scholar promise them in exchange for the invitation?`,

  CLAUDE_MODEL: 'claude-sonnet-4-20250514',

  CLASSES: {
    WARRIOR: {
      name: 'Warrior', color: 0xff6633,
      desc: 'Unbreakable frontliner. High HP, melee power.',
      bonuses: { hp: 40, attack: 4, defense: 6, speed: -10 },
      skills: ['TOUGHNESS', 'SLAM', 'IRON_SKIN'],
    },
    MAGE: {
      name: 'Mage', color: 0x8866ff,
      desc: 'Master of arcane destruction. Ranged, fragile.',
      bonuses: { hp: -10, attack: 8, defense: -2, speed: 5 },
      skills: ['FIREBALL', 'MANA_SHIELD', 'ARCANE_POWER'],
    },
    RANGER: {
      name: 'Ranger', color: 0x44cc88,
      desc: 'Swift hunter. Attack speed and evasion.',
      bonuses: { hp: 10, attack: 3, defense: 2, speed: 25 },
      skills: ['SWIFT_SHOT', 'EVASION', 'EAGLE_EYE'],
    },
  },

  SKILLS: {
    // Warrior
    TOUGHNESS:    { name:'Toughness',    class:'WARRIOR', desc:'Max HP +25 per rank', maxRank:3, effect:(p,r)=>{ p.stats.maxHp+=25; p.stats.hp=Math.min(p.stats.hp+25,p.stats.maxHp); } },
    SLAM:         { name:'Slam',         class:'WARRIOR', desc:'AoE attack every 8s', maxRank:3, effect:()=>{} },
    IRON_SKIN:    { name:'Iron Skin',    class:'WARRIOR', desc:'Defense +4 per rank',  maxRank:3, effect:(p,r)=>{ p.stats.defense+=4; } },
    // Mage
    FIREBALL:     { name:'Fireball',     class:'MAGE',    desc:'Ranged attack 180px',  maxRank:3, effect:()=>{} },
    MANA_SHIELD:  { name:'Mana Shield',  class:'MAGE',    desc:'15% dmg reduction/rank', maxRank:3, effect:()=>{} },
    ARCANE_POWER: { name:'Arcane Power', class:'MAGE',    desc:'Attack +6 per rank',   maxRank:3, effect:(p,r)=>{ p.stats.attack+=6; } },
    // Ranger
    SWIFT_SHOT:   { name:'Swift Shot',   class:'RANGER',  desc:'Atk speed +15% / rank', maxRank:3, effect:(p,r)=>{ p.attackCooldownBase = Math.max(300, (p.attackCooldownBase||850) - 130); } },
    EVASION:      { name:'Evasion',      class:'RANGER',  desc:'20% dodge chance/rank', maxRank:3, effect:()=>{} },
    EAGLE_EYE:    { name:'Eagle Eye',    class:'RANGER',  desc:'Attack range +20/rank', maxRank:3, effect:(p,r)=>{ p.attackRange = (p.attackRange||54) + 20; } },
  },

  BOSS_TYPES: {
    VOID_KNIGHT: {
      name:'Void Knight', hp:600, atk:28, def:12, xp:500, spd:44, color:0x6600aa, sz:28,
      loot:['gem','gem','sword','gold'],
      phases:[
        { threshold:0.66, msg:'The Void Knight awakens!' },
        { threshold:0.33, msg:'Void Knight enrages — darkness swells!' },
      ],
    },
    STONE_COLOSSUS: {
      name:'Stone Colossus', hp:900, atk:36, def:20, xp:750, spd:28, color:0x887755, sz:36,
      loot:['gem','gem','club','shield','gold'],
      phases:[
        { threshold:0.5, msg:'The Colossus cracks — and grows faster!' },
      ],
    },
  },

  QUEST_TEMPLATES: [
    { type:'KILL',    title:'Cull the {{enemy}}s', desc:'Slay {{count}} {{enemy}}s threatening the village.', target:'enemy', count:[3,5,8] },
    { type:'COLLECT', title:'Gather {{item}}',     desc:'Bring {{count}} {{item}} to Hearthmoor.',            target:'item',  count:[2,4]   },
    { type:'EXPLORE', title:'Scout the Ruins',     desc:'Reach the dungeon and return alive.',                target:'tile',  count:[1]     },
    { type:'TALK',    title:'A Message for {{npc}}', desc:'Deliver a message to {{npc}} in Hearthmoor.',     target:'npc',   count:[1]     },
  ],

  WEATHER_TYPES: ['CLEAR','CLEAR','CLEAR','RAIN','FOG','STORM'],

  DAY_CYCLE_SECONDS: 240,

  // Fixed seed so all players always see the same world terrain.
  WORLD_SEED: 42,
};
