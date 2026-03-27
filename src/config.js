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
    ARCHER:   { name:'Skeleton Archer', hp:45, atk:10, def:3, xp:55,  spd:38,  color:0xddddaa, sz:12, loot:['bones','bow','scroll','silver'],   ranged:true, range:180 },
    SPIDER:   { name:'Spider',      hp:28,  atk:7,  def:1,  xp:30,  spd:95,  color:0x222222, sz:8,  loot:['hide','herb','fang'],                         poison:true       },

    // Mid-tier threats (Elandor / dungeon mid-floors)
    BANDIT:   { name:'Bandit',       hp:72,  atk:14, def:6,  xp:75,  spd:62,  color:0xcc6622, sz:14, loot:['gold','gold','silver','sword','leather']          },
    WRAITH:   { name:'Wraith',       hp:55,  atk:18, def:2,  xp:90,  spd:70,  color:0x8844cc, sz:12, loot:['crystal','scroll','gem'],  ranged:true, range:200, void_touch:true },
    GOLEM:    { name:'Stone Golem',  hp:220, atk:22, def:16, xp:180, spd:22,  color:0x8888aa, sz:22, loot:['gem','gem','bones','shield']                       },
    CULTIST:  { name:'Void Cultist', hp:65,  atk:16, def:4,  xp:85,  spd:52,  color:0x440066, sz:12, loot:['crystal','scroll','robes'],  void_touch:true       },

    // High-tier threats (Ashveil / dungeon deep)
    DRAKE:    { name:'Void Drake',   hp:280, atk:30, def:12, xp:280, spd:48,  color:0x440022, sz:24, loot:['gem','gem','crystal','axe','gold'],  burn:true     },
    LICH:     { name:'Lich',         hp:180, atk:28, def:8,  xp:240, spd:40,  color:0x224466, sz:16, loot:['crystal','crystal','scroll','gem'], ranged:true, range:220, void_touch:true },
    BERSERKER:{ name:'Berserker',    hp:190, atk:32, def:5,  xp:210, spd:68,  color:0xaa2200, sz:18, loot:['axe','axe','gold','gold','gem'],     berserk:true  },
    PHANTOM:  { name:'Marsh Phantom',hp:40,  atk:12, def:0,  xp:60,  spd:82,  color:0x44aacc, sz:10, loot:['herb','crystal','scroll'],           ethereal:true },
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
    crystal:{ name:'Void Crystal',     type:'material',  value:180 },

    // Uncommon weapons (green)
    longsword:  { name:'Longsword',        type:'weapon',  atk:14,  value:180, rarity:'uncommon' },
    wand:       { name:'Arcane Wand',      type:'weapon',  atk:12,  value:160, rarity:'uncommon' },
    crossbow:   { name:'Crossbow',         type:'weapon',  atk:13,  value:170, rarity:'uncommon' },
    // Rare weapons (blue)
    runesword:  { name:'Runesword',        type:'weapon',  atk:22,  value:380, rarity:'rare'     },
    voidstaff:  { name:'Void Staff',       type:'weapon',  atk:20,  value:360, rarity:'rare'     },
    deathbow:   { name:'Deathbow',         type:'weapon',  atk:19,  value:340, rarity:'rare'     },
    // Epic weapons (purple)
    soulreaper: { name:"Soul Reaper",      type:'weapon',  atk:32,  value:700, rarity:'epic'     },
    voidblade:  { name:'Voidblade',        type:'weapon',  atk:30,  value:680, rarity:'epic'     },
    // Legendary (gold)
    crownblade: { name:'Crown Shard Blade',type:'weapon',  atk:45,  value:1500, rarity:'legendary' },

    // Uncommon armour
    platemail:  { name:'Plate Mail',       type:'armor',   def:10,  value:200, rarity:'uncommon' },
    voidrobe:   { name:'Void Robe',        type:'armor',   def:5,   value:180, rarity:'uncommon' },
    // Rare armour
    dragonhide: { name:'Dragonhide',       type:'armor',   def:16,  value:400, rarity:'rare'     },
    runeshield: { name:'Runeshield',       type:'armor',   def:18,  value:420, rarity:'rare'     },
    // Epic armour
    voidplate:  { name:'Void Plate',       type:'armor',   def:26,  value:750, rarity:'epic'     },
    // Legendary
    crownguard: { name:'Crown Shard Guard',type:'armor',   def:38,  value:1600, rarity:'legendary' },

    // New consumables
    antidote:   { name:'Antidote',         type:'consumable', heal:0, value:30,  cures:'POISON'  },
    manapotion: { name:'Mana Potion',      type:'consumable', heal:0, value:50,  restoresMana:60 },
    rejuvenate: { name:'Rejuvenation',     type:'consumable', heal:300,value:220, rarity:'rare'  },

    // New materials
    dragonscale:{ name:'Dragonscale',      type:'material',  value:220 },
    voidessence:{ name:'Void Essence',     type:'material',  value:300 },
    ancientwood:{ name:'Ancient Wood',     type:'material',  value:150 },
    soulstone:  { name:'Soulstone',        type:'material',  value:400 },
  },

  RECIPES: [
    { result:'potion',   materials:{ herb:2 },                 label:'Brew Health Potion'   },
    { result:'elixir',   materials:{ herb:3, gem:1 },          label:'Brew Grand Elixir'    },
    { result:'shield',   materials:{ bones:3, hide:1 },        label:'Craft Bone Shield'    },
    { result:'chainmail',materials:{ hide:4, bones:2 },        label:'Forge Chainmail'      },
    { result:'leather',  materials:{ hide:3 },                 label:'Craft Leather Armor'  },
  { result:'crystal',    materials:{ gem:2, bones:1 },             label:'Forge Void Crystal'   },
  { result:'longsword',  materials:{ sword:1, gem:1 },              label:'Forge Longsword'      },
  { result:'platemail',  materials:{ chainmail:1, gem:1 },          label:'Forge Plate Mail'     },
  { result:'runesword',  materials:{ longsword:1, crystal:1 },      label:'Etch Runesword'       },
  { result:'dragonhide', materials:{ hide:6, crystal:1 },           label:'Cure Dragonhide'      },
  { result:'antidote',   materials:{ herb:2, fang:1 },              label:'Brew Antidote'        },
  { result:'manapotion', materials:{ herb:1, crystal:1 },           label:'Brew Mana Potion'     },
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
    SLAM:         { name:'Slam',         class:'WARRIOR', desc:'AoE attack every 8s', maxRank:3, effect:(p)=>{ p.slamCD = 0; } },
    IRON_SKIN:    { name:'Iron Skin',    class:'WARRIOR', desc:'Defense +4 per rank',  maxRank:3, effect:(p,r)=>{ p.stats.defense+=4; } },
    // Warrior — new
    BATTLECRY:    { name:'Battlecry',     class:'WARRIOR', desc:'On kill: +15% attack for 5s (stacks 3×)', maxRank:3, effect:(p,r)=>{ p._battlecryRanks = r; } },
    // Mage
    FIREBALL:     { name:'Fireball',     class:'MAGE',    desc:'Ranged attack 180px',  maxRank:3, effect:(p)=>{ p.fireballCD = 0; } },
    MANA_SHIELD:  { name:'Mana Shield',  class:'MAGE',    desc:'15% dmg reduction/rank', maxRank:3, effect:()=>{} },
    ARCANE_POWER: { name:'Arcane Power', class:'MAGE',    desc:'Attack +6 per rank',   maxRank:3, effect:(p,r)=>{ p.stats.attack+=6; } },
    // Ranger
    SWIFT_SHOT:   { name:'Swift Shot',   class:'RANGER',  desc:'Atk speed +15% / rank', maxRank:3, effect:(p,r)=>{ p.attackCooldownBase = Math.max(300, (p.attackCooldownBase||850) - 130); } },
    EVASION:      { name:'Evasion',      class:'RANGER',  desc:'20% dodge chance/rank', maxRank:3, effect:(p,r)=>{ p.dodgeChance = r * 0.20; } },
    EAGLE_EYE:    { name:'Eagle Eye',    class:'RANGER',  desc:'Attack range +20/rank', maxRank:3, effect:(p,r)=>{ p.attackRange = CONFIG.PLAYER.ATTACK_RANGE / 16 + r * 1.25; } },
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
    LICH_KING: {
      name:'The Lich King', hp:1400, atk:42, def:18, xp:1200, spd:36, color:0x0022aa, sz:32,
      loot:['crystal','crystal','crystal','gem','gem','scroll'],
      phases:[
        { threshold:0.70, msg:'The Lich King raises his fallen — skeletons swarm!' },
        { threshold:0.40, msg:'Ice and Void merge — the air freezes!' },
        { threshold:0.15, msg:'LICHKING DESPERATE — reality tears!' },
      ],
    },
    FOREST_ANCIENT: {
      name:'Forest Ancient', hp:800, atk:26, def:22, xp:900, spd:20, color:0x226622, sz:40,
      loot:['gem','crystal','herb','herb','scroll'],
      phases:[
        { threshold:0.6, msg:'The Ancient calls the forest — roots erupt!' },
        { threshold:0.3, msg:'The Ancient burns — and becomes something else.' },
      ],
    },
    VOID_HERALD: {
      name:'Void Herald', hp:1100, atk:48, def:14, xp:1000, spd:52, color:0xcc00ff, sz:30,
      loot:['crystal','crystal','gem','gem','gem'],
      phases:[
        { threshold:0.75, msg:'The Void Herald opens a rift!' },
        { threshold:0.45, msg:'Reality distorts — the Herald phases!' },
        { threshold:0.20, msg:'VOID SURGE — the Herald becomes unstoppable!' },
      ],
    },
  },

  QUEST_TEMPLATES: [
    { type:'KILL',    title:'Cull the {{enemy}}s', desc:'Slay {{count}} {{enemy}}s threatening the village.', target:'enemy', count:[3,5,8] },
    { type:'COLLECT', title:'Gather {{item}}',     desc:'Bring {{count}} {{item}} to Hearthmoor.',            target:'item',  count:[2,4]   },
    { type:'EXPLORE', title:'Scout the Ruins',     desc:'Reach the dungeon and return alive.',                target:'tile',  count:[1]     },
    { type:'TALK',    title:'A Message for {{npc}}', desc:'Deliver a message to {{npc}} in Hearthmoor.',     target:'npc',   count:[1]     },
  { type:'KILL',    title:'Spider Hunt',          desc:'The spider nests spread faster every night. Kill {{count}} spiders.', target:'enemy', count:[4,6,10] },
  { type:'KILL',    title:'Silence the Archers',  desc:'Skeleton archers are picking off scouts. Kill {{count}} of them.',   target:'enemy', count:[3,5]    },
  { type:'KILL',    title:'Bandit Clearance',       desc:'Bandits control the road to the eastern ruins. Clear {{count}} of them.', target:'enemy', count:[4,6,8]  },
  { type:'KILL',    title:'The Cult Grows',          desc:'Void Cultists perform rituals near the dungeon. Stop {{count}}.',         target:'enemy', count:[3,5]    },
  { type:'KILL',    title:'Wraith Hunt',             desc:'Wraiths from the Marshes are haunting the roads. Banish {{count}}.',      target:'enemy', count:[2,4]    },
  { type:'COLLECT', title:'Rare Components',         desc:'Bring {{count}} Void Crystals for the enchanting forge.',                 target:'crystal', count:[1,2,3] },
  { type:'COLLECT', title:'Dragonscale',             desc:'A Drake was sighted near Ashveil. Bring back {{count}} scales.',          target:'dragonscale', count:[2,3] },
  { type:'EXPLORE', title:'The Ashveil Ruins',       desc:'A dwarven vault was spotted in the Peaks. Survive and return.',           target:'tile',  count:[1]      },
  { type:'EXPLORE', title:'Whispering Marshes',      desc:'Something moves in the Marshes. Investigate and report back.',            target:'tile',  count:[1]      },
  ],

  WEATHER_TYPES: ['CLEAR','CLEAR','CLEAR','RAIN','FOG','STORM'],

  DAY_CYCLE_SECONDS: 240,

  // Fixed seed so all players always see the same world terrain.
  RARITY: {
    common:    { name:'Common',    color:0xaaaaaa, cssColor:'#aaaaaa', dropMult:1.0,   xpMult:1.0  },
    uncommon:  { name:'Uncommon',  color:0x44ff44, cssColor:'#44ff44', dropMult:0.35,  xpMult:1.3  },
    rare:      { name:'Rare',      color:0x4488ff, cssColor:'#4488ff', dropMult:0.15,  xpMult:1.8  },
    epic:      { name:'Epic',      color:0xaa44ff, cssColor:'#aa44ff', dropMult:0.05,  xpMult:2.5  },
    legendary: { name:'Legendary', color:0xffaa00, cssColor:'#ffaa00', dropMult:0.008, xpMult:5.0  },
  },

  // Dungeon themes — used by DungeonScene3D to vary environment
  DUNGEON_THEMES: {
    CRYPT:    { name:'Forgotten Crypt',   wallColor:0x181818, floorColor:0x282828, fogDensity:0.05, enemyBias:['SKELETON','ARCHER','LICH'],    bossTypes:['VOID_KNIGHT'],   bgColor:0x050508 },
    FOREST:   { name:'Corrupted Forest',  wallColor:0x1a2e1a, floorColor:0x0f1f0f, fogDensity:0.04, enemyBias:['SPIDER','WOLF','PHANTOM'],     bossTypes:['FOREST_ANCIENT'], bgColor:0x060c06 },
    VOLCANIC: { name:'Ashveil Depths',    wallColor:0x3a1a0a, floorColor:0x2a0f00, fogDensity:0.06, enemyBias:['DRAKE','GOLEM','BERSERKER'],   bossTypes:['STONE_COLOSSUS'], bgColor:0x0f0500 },
    VOID:     { name:'Void Rift',         wallColor:0x0a0020, floorColor:0x050015, fogDensity:0.07, enemyBias:['WRAITH','CULTIST','LICH'],     bossTypes:['VOID_HERALD'],    bgColor:0x020008 },
    MARSH:    { name:'Sunken Vaults',     wallColor:0x0a1510, floorColor:0x081208, fogDensity:0.05, enemyBias:['PHANTOM','SPIDER','CULTIST'],  bossTypes:['LICH_KING'],      bgColor:0x030806 },
  },

  WORLD_SEED: 42,
};
