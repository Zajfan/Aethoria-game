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
    GOBLIN:   { name:'Goblin',   hp:30,  atk:5,  def:2, xp:25,  spd:58,  color:0x4caf50, sz:12, loot:['gold','sword'] },
    WOLF:     { name:'Wolf',     hp:48,  atk:8,  def:3, xp:38,  spd:78,  color:0xaaaaaa, sz:12, loot:['hide','fang'] },
    SKELETON: { name:'Skeleton', hp:58,  atk:12, def:5, xp:52,  spd:46,  color:0xeeeecc, sz:12, loot:['bones','sword'] },
    TROLL:    { name:'Troll',    hp:135, atk:18, def:8, xp:125, spd:36,  color:0x8d6e3a, sz:20, loot:['club','gem','gold'] },
  },

  ITEMS: {
    gold:   { name:'Gold Coins',    type:'currency',  value:20 },
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
    { result:'potion', materials:{ herb:2 },           label:'Brew Health Potion' },
    { result:'shield', materials:{ bones:3, hide:1 },  label:'Craft Bone Shield'  },
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
};
