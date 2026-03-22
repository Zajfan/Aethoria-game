export const CONFIG = {
  TILE_SIZE: 32,
  MAP_WIDTH:  120,
  MAP_HEIGHT: 120,

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
    sword:  { name:'Iron Sword',    type:'weapon',    atk:5,  value:50 },
    shield: { name:'Wood Shield',   type:'armor',     def:3,  value:30 },
    hide:   { name:'Animal Hide',   type:'material',  value:10 },
    bones:  { name:'Bones',         type:'material',  value:5 },
    fang:   { name:'Wolf Fang',     type:'material',  value:15 },
    gem:    { name:'Gemstone',      type:'material',  value:100 },
    club:   { name:'Troll Club',    type:'weapon',    atk:10, value:80 },
    herb:   { name:'Healing Herb',  type:'consumable',heal:25, value:25 },
    potion: { name:'Health Potion', type:'consumable',heal:60, value:60 },
  },

  RECIPES: [
    { result:'potion',   materials:{ herb:2 },                 label:'Brew Health Potion'   },
    { result:'elixir',   materials:{ herb:3, gem:1 },          label:'Brew Grand Elixir'    },
    { result:'shield',   materials:{ bones:3, hide:1 },        label:'Craft Bone Shield'    },
    { result:'chainmail',materials:{ hide:4, bones:2 },        label:'Forge Chainmail'      },
    { result:'leather',  materials:{ hide:3 },                 label:'Craft Leather Armor'  },
  ],

  NPCS_DATA: [
    { name:'Elder Lyra',  role:'Village Elder',  color:0xffd700, bio:'Ancient keeper of Aethoria\'s lore, has guided the village through countless crises' },
    { name:'Gareth',      role:'Blacksmith',     color:0xff8c00, bio:'Master smith who forges legendary blades; gruff but fair' },
    { name:'Mira',        role:'Herbalist',      color:0x66cc44, bio:'Gentle healer who knows every plant in the realm and their secret properties' },
    { name:'Dorin',       role:'Merchant',       color:0xaaaaff, bio:'Wily traveling trader with rare goods and even rarer information for sale' },
    { name:'Capt. Vel',   role:'Guard Captain',  color:0x4488ff, bio:'Veteran warrior, undefeated in battle, sworn to protect Hearthmoor at any cost' },
  ],

  WORLD_LORE: `Aethoria is an ancient realm shattered by the Voidlords who rose from the Deep.
The Crystal Crown that once unified the land was broken into five shards scattered across the world.
The village of Hearthmoor is the last beacon of light. Heroes rise to gather the shards and restore order.
Magic flows through leylines beneath the earth — those attuned to them gain power beyond mortal reckoning.`,

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
};
