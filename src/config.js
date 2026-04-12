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
    SKILL_POINTS_PER_LEVEL: 1,
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

    // ── Tier 3 — Ashveil / Crystal Wastes ─────────────────────────────────
    VOID_STALKER:  { name:'Void Stalker',     hp:160, atk:36, def:8,  xp:260, spd:90,  color:0x220044, sz:14, loot:['voidessence','crystal','gem'],          void_touch:true, stealth:true },
    SOUL_REAVER:   { name:'Soul Reaver',      hp:200, atk:30, def:10, xp:300, spd:55,  color:0x550088, sz:16, loot:['soulstone','crystal','voidessence'],     drain:true, ranged:true, range:200 },
    BONE_GIANT:    { name:'Bone Giant',       hp:380, atk:40, def:18, xp:380, spd:26,  color:0xddddbb, sz:32, loot:['bones','bones','gem','gem','club'],       },
    SHADOW_ASSASSIN:{ name:'Shadow Assassin',hp:130, atk:44, def:6,  xp:310, spd:96,  color:0x111122, sz:12, loot:['gem','silver','crystal','ancientwood'],   berserk:true, stealth:true },
    EMBER_DRAKE:   { name:'Ember Drake',      hp:320, atk:38, def:14, xp:350, spd:54,  color:0xff4400, sz:26, loot:['dragonscale','dragonscale','gem','axe'],  burn:true },
    CRYSTAL_WRAITH:{ name:'Crystal Wraith',   hp:120, atk:32, def:4,  xp:290, spd:72,  color:0x88ccff, sz:14, loot:['crystal','crystal','gem'],               ethereal:true, freeze:true, ranged:true, range:200 },
    PLAGUE_RAT:    { name:'Plague Rat',       hp:25,  atk:9,  def:1,  xp:28,  spd:110, color:0x556644, sz:8,  loot:['bones','herb'],                          poison:true },
    CORRUPTED_PALADIN:{ name:'Corrupted Paladin',hp:250, atk:34, def:20, xp:340, spd:46, color:0xccaa44, sz:18, loot:['gem','crystal','chainmail','scroll'],  void_touch:true },
    ANCIENT_GOLEM: { name:'Ancient Golem',    hp:500, atk:45, def:25, xp:450, spd:18,  color:0x667788, sz:28, loot:['gem','gem','gem','crystal','ancientwood'], },
    VOID_HORROR:   { name:'Void Horror',      hp:280, atk:50, def:12, xp:480, spd:38,  color:0x110022, sz:22, loot:['voidessence','voidessence','soulstone','crystal'], void_touch:true, ranged:true, range:220 },
    SPECTRAL_ARCHER:{ name:'Spectral Archer', hp:95,  atk:28, def:2,  xp:200, spd:60,  color:0x8888ff, sz:12, loot:['crystal','scroll','gem'],               ranged:true, range:240, ethereal:true },
    ICE_ELEMENTAL: { name:'Ice Elemental',    hp:220, atk:33, def:8,  xp:310, spd:42,  color:0xaaddff, sz:18, loot:['crystal','gem','ancientwood'],           freeze:true },
    VOID_ELEMENTAL:{ name:'Void Elemental',   hp:190, atk:38, def:6,  xp:340, spd:60,  color:0xcc00ff, sz:16, loot:['voidessence','crystal','soulstone'],     void_touch:true, ranged:true, range:180 },
    SWAMP_TROLL:   { name:'Swamp Troll',      hp:180, atk:20, def:12, xp:160, spd:30,  color:0x336633, sz:22, loot:['hide','gem','club','gold'],              poison:true },
    NECROMANCER_ADEPT:{ name:'Necromancer Adept',hp:110,atk:22,def:4, xp:180, spd:48,  color:0x443366, sz:14, loot:['soulstone','scroll','crystal'],          ranged:true, range:200, void_touch:true },
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

    // ── Gathering resources ──────────────────────────────────────────────
    iron_ore:   { name:'Iron Ore',         type:'material',  value:12  },
    coal:       { name:'Coal',             type:'material',  value:15  },
    mithril_ore:{ name:'Mithril Ore',      type:'material',  value:80  },
    runite_ore: { name:'Runite Ore',       type:'material',  value:200 },
    iron_bar:   { name:'Iron Bar',         type:'material',  value:30  },
    steel_bar:  { name:'Steel Bar',        type:'material',  value:75  },
    mithril_bar:{ name:'Mithril Bar',      type:'material',  value:180 },
    oak_log:    { name:'Oak Log',          type:'material',  value:8   },
    yew_log:    { name:'Yew Log',          type:'material',  value:35  },
    magic_log:  { name:'Magic Log',        type:'material',  value:120 },
    plank:      { name:'Plank',            type:'material',  value:18  },
    raw_fish:   { name:'Raw Fish',         type:'material',  value:10  },
    raw_shark:  { name:'Raw Shark',        type:'material',  value:60  },
    cooked_fish:{ name:'Cooked Fish',      type:'consumable',heal:30,  value:20 },
    cooked_shark:{ name:'Cooked Shark',    type:'consumable',heal:80,  value:90 },
    void_herb:  { name:'Nullwort',         type:'material',  value:120 },
    flax:       { name:'Flax',             type:'material',  value:8   },
    bowstring:  { name:'Bowstring',        type:'material',  value:20  },
    feather:    { name:'Feather',          type:'material',  value:2   },
    rabbit:     { name:'Raw Rabbit',       type:'material',  value:8   },
    wolf_meat:  { name:'Wolf Meat',        type:'material',  value:12  },

    // ── Gathering tools ──────────────────────────────────────────────────
    bronze_pick:{ name:'Bronze Pickaxe',   type:'tool', gatherType:'mining',    tier:1, value:40  },
    iron_pick:  { name:'Iron Pickaxe',     type:'tool', gatherType:'mining',    tier:2, value:150 },
    mithril_pick:{ name:'Mithril Pickaxe', type:'tool', gatherType:'mining',    tier:3, value:500 },
    bronze_axe: { name:'Bronze Axe',       type:'tool', gatherType:'woodcut',   tier:1, value:40  },
    iron_axe:   { name:'Iron Axe',         type:'tool', gatherType:'woodcut',   tier:2, value:150 },
    mithril_axe:{ name:'Mithril Axe',      type:'tool', gatherType:'woodcut',   tier:3, value:500 },
    fishing_rod:{ name:'Fishing Rod',      type:'tool', gatherType:'fishing',   tier:1, value:30  },
    fly_rod:    { name:'Fly Rod',          type:'tool', gatherType:'fishing',   tier:2, value:120 },
    hunting_bow:{ name:'Hunter\'s Bow',    type:'tool', gatherType:'hunting',   tier:1, value:50  },
    herb_knife: { name:'Herb Knife',       type:'tool', gatherType:'herbalism', tier:1, value:25  },

    // ── Accessories (new slot) ───────────────────────────────────────────
    ring_power:   { name:'Ring of Power',     type:'accessory', atk:5,  value:250,  rarity:'uncommon' },
    ring_life:    { name:'Ring of Life',      type:'accessory', hp:30,  value:250,  rarity:'uncommon' },
    ring_shadow:  { name:'Ring of Shadows',   type:'accessory', spd:15, value:280,  rarity:'uncommon' },
    amulet_soul:  { name:'Soul Amulet',       type:'accessory', hp:50, atk:4, value:450, rarity:'rare' },
    amulet_fury:  { name:'Amulet of Fury',    type:'accessory', atk:8, def:6, value:700, rarity:'rare' },
    amulet_void:  { name:'Void Pendant',      type:'accessory', atk:12, value:900, rarity:'epic', voidBonus:true },
    ring_void:    { name:'Voidlord\'s Ring',  type:'accessory', atk:10, def:5, value:1200, rarity:'legendary' },

    // ── Necromancer equipment ────────────────────────────────────────────
    bone_staff:   { name:'Bone Staff',        type:'weapon', atk:10,  value:95,  rarity:'common'   },
    death_scythe: { name:'Death Scythe',      type:'weapon', atk:18,  value:280, rarity:'uncommon' },
    lichblade:    { name:'Lichblade',         type:'weapon', atk:26,  value:450, rarity:'rare',    drainOnHit:true },
    soulweaver:   { name:'Soulweaver\'s Staff',type:'weapon',atk:35,  value:750, rarity:'epic'     },
    death_shroud: { name:'Death Shroud',      type:'armor',  def:3,   value:80,  rarity:'common'   },
    spectral_robe:{ name:'Spectral Robe',     type:'armor',  def:7,   value:220, rarity:'uncommon' },
    bonelord_plate:{ name:'Bonelord Plate',   type:'armor',  def:20,  value:550, rarity:'rare'     },

    // ── Paladin equipment ────────────────────────────────────────────────
    holy_sword:   { name:'Holy Sword',        type:'weapon', atk:9,   value:90,  rarity:'common',  holyDmg:true },
    dawn_blade:   { name:'Dawnblade',         type:'weapon', atk:17,  value:270, rarity:'uncommon',holyDmg:true },
    sunbreaker:   { name:'Sunbreaker',        type:'weapon', atk:25,  value:480, rarity:'rare',    holyDmg:true },
    solar_aegis:  { name:'Solar Aegis',       type:'weapon', atk:34,  value:760, rarity:'epic',    holyDmg:true },
    blessed_shield:{ name:'Blessed Shield',   type:'armor',  def:8,   value:120, rarity:'common'   },
    paladin_plate: { name:'Paladin Plate',    type:'armor',  def:14,  value:320, rarity:'uncommon' },
    aegis_of_dawn: { name:'Aegis of Dawn',    type:'armor',  def:22,  value:600, rarity:'rare'     },

    // ── New consumables ──────────────────────────────────────────────────
    stamina_pot:  { name:'Stamina Potion',    type:'consumable', speedBoost:30, duration:30, value:45 },
    strength_pot: { name:'Strength Potion',   type:'consumable', atkBoost:8,    duration:45, value:80 },
    defence_pot:  { name:'Defence Potion',    type:'consumable', defBoost:8,    duration:45, value:80 },
    ranging_pot:  { name:'Ranging Potion',    type:'consumable', atkBoost:6,    duration:45, value:70 },
    holy_water:   { name:'Holy Water',        type:'consumable', heal:50, holyDmg:true, value:55 },
    void_brew:    { name:'Void Brew',         type:'consumable', heal:0, atkBoost:15, hpCost:10, duration:20, value:180, rarity:'rare' },
    nullwort_tea: { name:'Nullwort Tea',      type:'consumable', heal:0, cures:'ALL', value:200, rarity:'rare' },
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

  // ── Smithing (requires Mining) ───────────────────────────────────────────────
  { result:'iron_bar',   materials:{ iron_ore:2 },                  label:'Smelt Iron Bar',       skill:'smithing', level:1  },
  { result:'steel_bar',  materials:{ iron_ore:2, coal:1 },          label:'Smelt Steel Bar',      skill:'smithing', level:15 },
  { result:'mithril_bar',materials:{ mithril_ore:2, coal:2 },       label:'Smelt Mithril Bar',    skill:'smithing', level:30 },

  // ── Woodworking ──────────────────────────────────────────────────────────────
  { result:'plank',      materials:{ oak_log:2 },                   label:'Saw Plank',            skill:'woodcut',  level:5  },
  { result:'bowstring',  materials:{ flax:3 },                      label:'Spin Bowstring',       skill:'herbalism',level:5  },

  // ── Cooking ──────────────────────────────────────────────────────────────────
  { result:'cooked_fish',  materials:{ raw_fish:1 },                label:'Cook Fish',            skill:'fishing',  level:1  },
  { result:'cooked_shark', materials:{ raw_shark:1 },               label:'Cook Shark',           skill:'fishing',  level:20 },

  // ── Alchemy ──────────────────────────────────────────────────────────────────
  { result:'stamina_pot',  materials:{ herb:1, feather:2 },         label:'Brew Stamina Potion',  skill:'herbalism',level:10 },
  { result:'strength_pot', materials:{ herb:2, iron_bar:1 },        label:'Brew Strength Potion', skill:'herbalism',level:15 },
  { result:'defence_pot',  materials:{ herb:2, bones:1 },           label:'Brew Defence Potion',  skill:'herbalism',level:15 },
  { result:'ranging_pot',  materials:{ herb:1, feather:3 },         label:'Brew Ranging Potion',  skill:'herbalism',level:12 },
  { result:'nullwort_tea', materials:{ void_herb:2, crystal:1 },    label:'Brew Nullwort Tea',    skill:'herbalism',level:25 },
  { result:'holy_water',   materials:{ potion:1, crystal:1 },       label:'Bless Water',          skill:'herbalism',level:20 },

  // ── Weaponsmithing (iron tier) ────────────────────────────────────────────────
  { result:'holy_sword',  materials:{ iron_bar:3 },                 label:'Forge Holy Sword',     skill:'smithing', level:10 },
  { result:'bone_staff',  materials:{ bones:4, ancientwood:1 },     label:'Craft Bone Staff',                               },
  { result:'death_scythe',materials:{ iron_bar:2, soulstone:1 },    label:'Forge Death Scythe',   skill:'smithing', level:20 },
  { result:'dawn_blade',  materials:{ iron_bar:4, gem:1 },          label:'Forge Dawnblade',      skill:'smithing', level:25 },

  // ── Armorsmithing ─────────────────────────────────────────────────────────────
  { result:'death_shroud',materials:{ hide:2, crystal:1 },          label:'Sew Death Shroud',                               },
  { result:'blessed_shield',materials:{ iron_bar:2, hide:2 },       label:'Forge Blessed Shield', skill:'smithing', level:12 },
  { result:'paladin_plate',materials:{ iron_bar:6, gem:1 },         label:'Forge Paladin Plate',  skill:'smithing', level:22 },

  // ── Accessories ───────────────────────────────────────────────────────────────
  { result:'ring_power',  materials:{ gem:2, gold:1 },              label:'Craft Ring of Power'                             },
  { result:'ring_life',   materials:{ gem:1, hide:3 },              label:'Craft Ring of Life'                              },
  { result:'amulet_soul', materials:{ gem:2, soulstone:1 },         label:'Forge Soul Amulet'                               },
  { result:'amulet_fury', materials:{ gem:3, dragonscale:2 },       label:'Forge Amulet of Fury'                            },
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
    {
      name:'Sister Vashe', role:'Veilbound Mage', color:0x9944cc,
      bio:'One of the last practitioners of Veilbound shadow-craft. She arrived in Hearthmoor three months ago without explaining why she left Saltmere. Has translated more of the Void Gate inscription than anyone else alive, and does not sleep much.',
      hint:'Vashe joins in Act IV. She gives lore-heavy quests and can teach forbidden skills. Ask about the inscription.',
    },
    {
      name:'Master Theron', role:'Slayer Master', color:0xdd4422,
      bio:'The only Slayer Master still operating east of the Amber Road. Lost his left hand to a Void Stalker and replaced it with an iron hook that he sharpens every morning. Assigns monster hunt contracts and rewards those who complete them with marks of distinction.',
      hint:'Theron assigns weekly Slayer Tasks. Complete them for Slayer Points to unlock unique items and areas.',
    },
    {
      name:'Aldric', role:'Necromancer Outcast', color:0x443366,
      bio:'Expelled from the Order of the Sealed Sun for studying the wrong half of Void lore. Lives alone in the ruins east of the village. Not evil — extremely careful. Has discovered that some of the dead in Aethoria are not properly dead, and is trying to find out why.',
      hint:'Aldric teaches Necromancer skills and gives quests about the undead. He reacts to boss kills with scholarly interest.',
    },
    {
      name:'High Priestess Solara', role:'Order of the Sealed Sun', color:0xffee88,
      bio:'The last of the Order who still holds the title. She arrived from the east a week before the player did. She has seen three Sealed Sun temples fall and believes the fourth will not. She is wrong, but not in the way she thinks.',
      hint:'Solara unlocks Order of the Sealed Sun quests and faction content in Act III onward. Ask about the Sealing.',
    },
  ],

  WORLD_LORE: `Aethoria is an ancient realm. Three hundred years ago, the Crystal Crown was shattered by the Voidlords — beings from beyond the leylines who were invited here by a scholar who thought they would teach and not consume. She was wrong. The Crown broke into five shards. The kingdoms fell one by one, not to war but to forgetting. Hearthmoor survives because of a Sealing performed by Elder Lyra — an act whose true cost she has never revealed. The five shards must be gathered to restore the Crown and send the Voidlords back. The question no one has asked yet: what did the scholar promise them in exchange for the invitation?`,

  CLAUDE_MODEL: 'claude-sonnet-4-20250514',

  CLASSES: {
    WARRIOR: {
      name: 'Warrior', color: 0xff6633,
      desc: 'Unbreakable frontliner. High HP, melee power, battlefield control.',
      bonuses: { hp: 40, attack: 4, defense: 6, speed: -10 },
      skills: ['TOUGHNESS','SLAM','IRON_SKIN','BATTLECRY','WARCRY','SHIELD_WALL','EXECUTE','BLOOD_RAGE'],
    },
    MAGE: {
      name: 'Mage', color: 0x8866ff,
      desc: 'Master of arcane destruction. Ranged, fragile, devastating.',
      bonuses: { hp: -10, attack: 8, defense: -2, speed: 5 },
      skills: ['FIREBALL','MANA_SHIELD','ARCANE_POWER','FROST_BOLT','CHAIN_LIGHTNING','MANA_SURGE','ARCANE_MASTERY','VOID_TOUCH_S'],
    },
    RANGER: {
      name: 'Ranger', color: 0x44cc88,
      desc: 'Swift hunter. Deadly at range, impossible to pin down.',
      bonuses: { hp: 10, attack: 3, defense: 2, speed: 25 },
      skills: ['SWIFT_SHOT','EVASION','EAGLE_EYE','POISON_ARROW','SHADOW_STEP','TRAPPER','PREDATOR','DEATH_MARK'],
    },
    NECROMANCER: {
      name: 'Necromancer', color: 0x8844cc,
      desc: 'Master of death. Commands the undead, drains life, and turns enemies\' power against them.',
      bonuses: { hp: -20, attack: 6, defense: -3, speed: 0 },
      skills: ['BONE_ARMOR','RAISE_DEAD','SOUL_DRAIN','DEATH_COIL','CORPSE_EXPLOSION','SUMMON_LICH','UNDYING','VOID_PACT'],
    },
    PALADIN: {
      name: 'Paladin', color: 0xffee44,
      desc: 'Holy warrior. Heals, smites undead and void foes, and shields allies with divine light.',
      bonuses: { hp: 30, attack: 2, defense: 8, speed: -5 },
      skills: ['HOLY_STRIKE','DIVINE_SHIELD','CONSECRATE','LAY_ON_HANDS','AURA_OF_LIGHT','SMITE','RADIANT_CHARGE','DIVINE_WRATH'],
    },
  },

  // Skill point cost per rank (rank 1 costs 1pt, rank 2 costs 2pt, etc.)
  SKILL_POINT_COST: [0, 1, 2, 3, 4, 5],

  SKILLS: {
    // ══════════════════════════════════════════════════════════════
    // WARRIOR — Tier 1 (available from level 1)
    // ══════════════════════════════════════════════════════════════
    TOUGHNESS: {
      name:'Toughness', class:'WARRIOR', tier:1,
      desc:'Fortify your body. Max HP +30 per rank.',
      maxRank:5, icon:'🛡',
      requires: [],
      effect:(p,r)=>{ p.stats.maxHp+=30; p.stats.hp=Math.min(p.stats.hp+30,p.stats.maxHp); },
    },
    SLAM: {
      name:'Slam', class:'WARRIOR', tier:1,
      desc:'Seismic AoE strike every 6s. Range and damage grow per rank.',
      maxRank:3, icon:'💥',
      requires: [],
      effect:(p,r)=>{ p.slamCD = 0; },
    },
    IRON_SKIN: {
      name:'Iron Skin', class:'WARRIOR', tier:1,
      desc:'Harden your armour. Defense +5 per rank.',
      maxRank:5, icon:'⚙',
      requires: [],
      effect:(p,r)=>{ p.stats.defense+=5; },
    },
    // WARRIOR — Tier 2 (requires 1 Tier 1 skill at rank 2+)
    BATTLECRY: {
      name:'Battlecry', class:'WARRIOR', tier:2,
      desc:'On kill: gain +12% attack for 6s, stacks up to 4×.',
      maxRank:4, icon:'📯',
      requires: ['TOUGHNESS:2'],
      effect:(p,r)=>{ p._battlecryRanks = r; },
    },
    WARCRY: {
      name:'Warcry', class:'WARRIOR', tier:2,
      desc:'Reduce all ability cooldowns by 15% per rank.',
      maxRank:3, icon:'📢',
      requires: ['SLAM:2'],
      effect:(p,r)=>{ p._warcryRanks = r; },
    },
    SHIELD_WALL: {
      name:'Shield Wall', class:'WARRIOR', tier:2,
      desc:'While not moving: take 20% less damage per rank.',
      maxRank:3, icon:'🏛',
      requires: ['IRON_SKIN:2'],
      effect:(p,r)=>{ p._shieldWallRanks = r; },
    },
    // WARRIOR — Tier 3 (requires 2 Tier 2 skills at rank 2+)
    EXECUTE: {
      name:'Execute', class:'WARRIOR', tier:3,
      desc:'Attacks deal +100% damage to enemies below 25% HP.',
      maxRank:3, icon:'☠',
      requires: ['BATTLECRY:2', 'WARCRY:2'],
      effect:(p,r)=>{ p._executeRanks = r; },
    },
    BLOOD_RAGE: {
      name:'Blood Rage', class:'WARRIOR', tier:3,
      desc:'On taking damage: gain 8% attack speed for 4s. Stacks 5×.',
      maxRank:3, icon:'🩸',
      requires: ['WARCRY:2', 'SHIELD_WALL:2'],
      effect:(p,r)=>{ p._bloodRageRanks = r; },
    },

    // ══════════════════════════════════════════════════════════════
    // MAGE — Tier 1
    // ══════════════════════════════════════════════════════════════
    FIREBALL: {
      name:'Fireball', class:'MAGE', tier:1,
      desc:'Ranged fire attack. Burns target. Range +20 per rank.',
      maxRank:5, icon:'🔥',
      requires: [],
      effect:(p,r)=>{ p.fireballCD = 0; p.attackRange = (54+r*20)/16; },
    },
    MANA_SHIELD: {
      name:'Mana Shield', class:'MAGE', tier:1,
      desc:'Convert incoming damage to mana loss. 15% reduction per rank.',
      maxRank:3, icon:'🔮',
      requires: [],
      effect:()=>{},
    },
    ARCANE_POWER: {
      name:'Arcane Power', class:'MAGE', tier:1,
      desc:'Raw spell power. Attack +7 per rank.',
      maxRank:5, icon:'✨',
      requires: [],
      effect:(p,r)=>{ p.stats.attack+=7; },
    },
    // MAGE — Tier 2
    FROST_BOLT: {
      name:'Frost Bolt', class:'MAGE', tier:2,
      desc:'Ranged ice attack that slows targets by 40% per rank for 3s.',
      maxRank:3, icon:'❄',
      requires: ['FIREBALL:2'],
      effect:(p,r)=>{ p._frostBoltRanks = r; },
    },
    CHAIN_LIGHTNING: {
      name:'Chain Lightning', class:'MAGE', tier:2,
      desc:'Attacks chain to 1 nearby enemy per rank. 70% damage per jump.',
      maxRank:3, icon:'⚡',
      requires: ['ARCANE_POWER:2'],
      effect:(p,r)=>{ p._chainLightningRanks = r; },
    },
    MANA_SURGE: {
      name:'Mana Surge', class:'MAGE', tier:2,
      desc:'Mana regen +3/s per rank. Excess mana converts to shield.',
      maxRank:4, icon:'💧',
      requires: ['MANA_SHIELD:2'],
      effect:(p,r)=>{ p._manaSurgeRanks = r; },
    },
    // MAGE — Tier 3
    ARCANE_MASTERY: {
      name:'Arcane Mastery', class:'MAGE', tier:3,
      desc:'All spells cost 20% less mana and deal 15% more damage per rank.',
      maxRank:3, icon:'🌟',
      requires: ['FROST_BOLT:2', 'CHAIN_LIGHTNING:2'],
      effect:(p,r)=>{ p._arcaneMasteryRanks = r; },
    },
    VOID_TOUCH_S: {
      name:'Void Touch', class:'MAGE', tier:3,
      desc:'20% chance on hit to apply VOID_CURSE. Void damage +25% per rank.',
      maxRank:3, icon:'👁',
      requires: ['CHAIN_LIGHTNING:2', 'MANA_SURGE:2'],
      effect:(p,r)=>{ p._voidTouchSkillRanks = r; },
    },

    // ══════════════════════════════════════════════════════════════
    // RANGER — Tier 1
    // ══════════════════════════════════════════════════════════════
    SWIFT_SHOT: {
      name:'Swift Shot', class:'RANGER', tier:1,
      desc:'Attack speed +18% per rank. Arrow release is instant.',
      maxRank:5, icon:'🏹',
      requires: [],
      effect:(p,r)=>{ p.attackCooldownBase = Math.max(250, (p.attackCooldownBase||850) - 120); },
    },
    EVASION: {
      name:'Evasion', class:'RANGER', tier:1,
      desc:'Dodge chance +18% per rank. Dodged hits restore 5 mana.',
      maxRank:4, icon:'💨',
      requires: [],
      effect:(p,r)=>{ p.dodgeChance = r * 0.18; },
    },
    EAGLE_EYE: {
      name:'Eagle Eye', class:'RANGER', tier:1,
      desc:'Attack range +25 per rank. Critical hits reveal enemy location.',
      maxRank:4, icon:'👁',
      requires: [],
      effect:(p,r)=>{ p.attackRange = (54+r*25)/16; },
    },
    // RANGER — Tier 2
    POISON_ARROW: {
      name:'Poison Arrow', class:'RANGER', tier:2,
      desc:'Attacks have 30% (+10%/rank) chance to POISON. Stacks up to 3×.',
      maxRank:3, icon:'☠',
      requires: ['SWIFT_SHOT:2'],
      effect:(p,r)=>{ p._poisonArrowRanks = r; },
    },
    SHADOW_STEP: {
      name:'Shadow Step', class:'RANGER', tier:2,
      desc:'On dodge: teleport 3 tiles away from attacker. Cooldown 8s.',
      maxRank:2, icon:'🌑',
      requires: ['EVASION:2'],
      effect:(p,r)=>{ p._shadowStepRanks = r; },
    },
    TRAPPER: {
      name:'Trapper', class:'RANGER', tier:2,
      desc:'Enemies that attack you are SLOWED 30% for 4s per rank.',
      maxRank:3, icon:'🪤',
      requires: ['EAGLE_EYE:2'],
      effect:(p,r)=>{ p._trapperRanks = r; },
    },
    // RANGER — Tier 3
    PREDATOR: {
      name:'Predator', class:'RANGER', tier:3,
      desc:'Deal +8% damage per rank for each status effect on the target.',
      maxRank:3, icon:'🐺',
      requires: ['POISON_ARROW:2', 'SHADOW_STEP:1'],
      effect:(p,r)=>{ p._predatorRanks = r; },
    },
    DEATH_MARK: {
      name:'Death Mark', class:'RANGER', tier:3,
      desc:'First hit on a full-HP enemy deals 3× damage. 20s cooldown.',
      maxRank:3, icon:'💀',
      requires: ['SHADOW_STEP:1', 'TRAPPER:2'],
      effect:(p,r)=>{ p._deathMarkRanks = r; p._deathMarkCD = 0; },
    },

    // ══════════════════════════════════════════════════════════════
    // NECROMANCER — Tier 1
    // ══════════════════════════════════════════════════════════════
    BONE_ARMOR: {
      name:'Bone Armor', class:'NECROMANCER', tier:1,
      desc:'Surround yourself with orbiting bones. Defense +6 per rank. Bones shatter dealing damage on impact.',
      maxRank:5, icon:'🦴',
      requires: [],
      effect:(p,r)=>{ p.stats.defense += 6; },
    },
    RAISE_DEAD: {
      name:'Raise Dead', class:'NECROMANCER', tier:1,
      desc:'Animate fallen enemies as minions. +1 max minion per rank. Minions last 60s.',
      maxRank:5, icon:'💀',
      requires: [],
      effect:(p,r)=>{ p._raisedDeadRanks = r; p._maxMinions = r; },
    },
    SOUL_DRAIN: {
      name:'Soul Drain', class:'NECROMANCER', tier:1,
      desc:'Ranged attack that steals HP. Heals you for 30% of damage dealt per rank.',
      maxRank:4, icon:'🩸',
      requires: [],
      effect:(p,r)=>{ p._soulDrainRanks = r; },
    },
    // NECROMANCER — Tier 2
    DEATH_COIL: {
      name:'Death Coil', class:'NECROMANCER', tier:2,
      desc:'Hurl a coil of void energy. Stuns for 2s. Damage +20% per rank.',
      maxRank:3, icon:'☠',
      requires: ['RAISE_DEAD:2'],
      effect:(p,r)=>{ p._deathCoilRanks = r; },
    },
    CORPSE_EXPLOSION: {
      name:'Corpse Explosion', class:'NECROMANCER', tier:2,
      desc:'Detonate a corpse or minion for massive AoE damage. Radius +1 tile per rank.',
      maxRank:3, icon:'💥',
      requires: ['BONE_ARMOR:2'],
      effect:(p,r)=>{ p._corpseExplosionRanks = r; },
    },
    SUMMON_LICH: {
      name:'Summon Lich', class:'NECROMANCER', tier:2,
      desc:'Summon a powerful lich minion that casts ranged void bolts. Stats +20% per rank.',
      maxRank:2, icon:'👁',
      requires: ['SOUL_DRAIN:2'],
      effect:(p,r)=>{ p._summonLichRanks = r; },
    },
    // NECROMANCER — Tier 3
    UNDYING: {
      name:'Undying', class:'NECROMANCER', tier:3,
      desc:'On death: survive at 1 HP, drain life from all minions. 120s cooldown. Effect improves per rank.',
      maxRank:3, icon:'♾',
      requires: ['DEATH_COIL:2', 'CORPSE_EXPLOSION:2'],
      effect:(p,r)=>{ p._undyingRanks = r; },
    },
    VOID_PACT: {
      name:'Void Pact', class:'NECROMANCER', tier:3,
      desc:'Sacrifice 20% max HP for 40% more spell damage and +2 max minions for 30s.',
      maxRank:3, icon:'🌑',
      requires: ['CORPSE_EXPLOSION:2', 'SUMMON_LICH:1'],
      effect:(p,r)=>{ p._voidPactRanks = r; },
    },

    // ══════════════════════════════════════════════════════════════
    // PALADIN — Tier 1
    // ══════════════════════════════════════════════════════════════
    HOLY_STRIKE: {
      name:'Holy Strike', class:'PALADIN', tier:1,
      desc:'Melee attack that deals bonus holy damage. +8 holy dmg vs undead/void per rank.',
      maxRank:5, icon:'✝',
      requires: [],
      effect:(p,r)=>{ p._holyStrikeRanks = r; },
    },
    DIVINE_SHIELD: {
      name:'Divine Shield', class:'PALADIN', tier:1,
      desc:'Activate: become immune to damage for 3s. Cooldown 45s. Duration +1s per rank.',
      maxRank:3, icon:'🛡',
      requires: [],
      effect:(p,r)=>{ p._divineShieldRanks = r; p._divineShieldCD = 0; },
    },
    CONSECRATE: {
      name:'Consecrate', class:'PALADIN', tier:1,
      desc:'Consecrate the ground beneath you. Enemies take 5 holy damage/s. Radius +1 per rank.',
      maxRank:4, icon:'☀',
      requires: [],
      effect:(p,r)=>{ p._consecrateRanks = r; },
    },
    // PALADIN — Tier 2
    LAY_ON_HANDS: {
      name:'Lay on Hands', class:'PALADIN', tier:2,
      desc:'Instant full heal. 120s cooldown. Cooldown -15s per rank.',
      maxRank:4, icon:'❤',
      requires: ['DIVINE_SHIELD:2'],
      effect:(p,r)=>{ p._layOnHandsRanks = r; p._layOnHandsCD = 0; },
    },
    AURA_OF_LIGHT: {
      name:'Aura of Light', class:'PALADIN', tier:2,
      desc:'Passive: regen 2 HP/s per rank. Undead enemies are weakened 10% per rank.',
      maxRank:4, icon:'🌟',
      requires: ['HOLY_STRIKE:2'],
      effect:(p,r)=>{ p._auraOfLightRanks = r; },
    },
    SMITE: {
      name:'Smite', class:'PALADIN', tier:2,
      desc:'Call down a pillar of light on a target. 250% damage vs void enemies. 10s cooldown.',
      maxRank:3, icon:'⚡',
      requires: ['CONSECRATE:2'],
      effect:(p,r)=>{ p._smiteRanks = r; p._smiteCD = 0; },
    },
    // PALADIN — Tier 3
    RADIANT_CHARGE: {
      name:'Radiant Charge', class:'PALADIN', tier:3,
      desc:'Charge forward, dealing holy AoE damage on impact. Heals you for 50% of damage dealt.',
      maxRank:3, icon:'💫',
      requires: ['AURA_OF_LIGHT:2', 'SMITE:2'],
      effect:(p,r)=>{ p._radiantChargeRanks = r; p._radiantChargeCD = 0; },
    },
    DIVINE_WRATH: {
      name:'Divine Wrath', class:'PALADIN', tier:3,
      desc:'For 10s: all attacks deal +50% holy damage, you take 30% less damage. 90s cooldown.',
      maxRank:3, icon:'👑',
      requires: ['LAY_ON_HANDS:2', 'SMITE:2'],
      effect:(p,r)=>{ p._divineWrathRanks = r; p._divineWrathCD = 0; },
    },
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

    // ── New bosses ─────────────────────────────────────────────────────────────

    BONE_TYRANT: {
      name:'Bone Tyrant', hp:1800, atk:52, def:20, xp:1600, spd:30, color:0xeeddcc, sz:44,
      loot:['soulstone','soulstone','crystal','gem','gem','bones'],
      phases:[
        { threshold:0.70, msg:'The Bone Tyrant raises a wall of dead — skeletons erupt from the ground!' },
        { threshold:0.40, msg:'The Tyrant shatters its own ribcage — bone shards slice everything!' },
        { threshold:0.15, msg:'DEATH WAIL — the Bone Tyrant unleashes its scream!' },
      ],
    },

    VOID_EMPRESS: {
      name:'The Void Empress', hp:2200, atk:60, def:22, xp:2000, spd:44, color:0xff00cc, sz:36,
      loot:['voidessence','voidessence','soulstone','crystal','crystal','gem'],
      phases:[
        { threshold:0.80, msg:'The Empress tears a wound in reality — void beams arc across the chamber!' },
        { threshold:0.55, msg:'She steps outside time — attacks from impossible angles!' },
        { threshold:0.30, msg:'VOID STORM — the Empress becomes a hurricane of darkness!' },
        { threshold:0.10, msg:'Last resort: the Empress collapses into herself — run!' },
      ],
    },

    CRYSTAL_TITAN: {
      name:'Crystal Titan', hp:2600, atk:55, def:30, xp:2400, spd:20, color:0x88ddff, sz:52,
      loot:['ancientwood','crystal','crystal','gem','gem','gem','mithril_ore'],
      phases:[
        { threshold:0.65, msg:'The Titan\'s crystal skin cracks — it starts shedding blade-shards!' },
        { threshold:0.35, msg:'The Titan freezes the ground — the arena becomes treacherous!' },
        { threshold:0.15, msg:'ABSOLUTE ZERO — the Titan emits a killing frost!' },
      ],
    },

    CORRUPTED_ELDER: {
      name:'Corrupted Elder', hp:1600, atk:44, def:16, xp:1800, spd:38, color:0x554400, sz:32,
      loot:['voidessence','soulstone','crystal','scroll','scroll','gem'],
      phases:[
        { threshold:0.60, msg:'The Elder\'s eyes go black — she speaks in the Voidlords\' tongue!' },
        { threshold:0.25, msg:'The pact tears open — ancient power floods the chamber!' },
      ],
    },

    THE_AMALGAM: {
      name:'The Amalgam', hp:3000, atk:58, def:18, xp:3000, spd:50, color:0x441133, sz:40,
      loot:['voidessence','voidessence','voidessence','soulstone','soulstone','ring_void'],
      phases:[
        { threshold:0.75, msg:'The Amalgam absorbs nearby enemies — it grows!' },
        { threshold:0.50, msg:'It splits into three forms — attack the largest!' },
        { threshold:0.25, msg:'FULL MERGE — a single unstoppable being!' },
        { threshold:0.08, msg:'DIMENSIONAL COLLAPSE — everything is pulled toward it!' },
      ],
    },

    NIGHTMARE_DRAKE: {
      name:'Nightmare Drake', hp:1500, atk:55, def:16, xp:1400, spd:62, color:0x220011, sz:38,
      loot:['dragonscale','dragonscale','dragonscale','gem','gem','ember_heart'],
      phases:[
        { threshold:0.60, msg:'The Drake\'s wounds ignite — fire hemorrhages from every crack!' },
        { threshold:0.30, msg:'NIGHTMARE ROAR — the Drake\'s scream causes STUN to all nearby!' },
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
  { type:'KILL',    title:'Necropolis Clearance',    desc:'Bone Giants stir in the Necropolis. Destroy {{count}} before they reach the road.', target:'enemy', count:[2,3] },
  { type:'KILL',    title:'Void Stalkers',           desc:'Something invisible hunts the Crystal Wastes. Track and kill {{count}}.',    target:'enemy', count:[2,4]    },
  { type:'KILL',    title:'The Amalgam Feeds',       desc:'Soul Reavers drain the fallen. Destroy {{count}} before they grow stronger.', target:'enemy', count:[3,5]   },
  { type:'COLLECT', title:'Iron from the Earth',     desc:'Mine {{count}} iron ore from the old quarry for the smithy.',                 target:'iron_ore', count:[3,5,8] },
  { type:'COLLECT', title:'Timber for the Watch',    desc:'Hearthmoor needs lumber. Bring {{count}} oak logs from the eastern forest.',  target:'oak_log', count:[5,8,10] },
  { type:'COLLECT', title:'Fresh Catch',             desc:'The village stores are low. Bring {{count}} raw fish from the river.',        target:'raw_fish', count:[4,6,8] },
  { type:'COLLECT', title:'Nullwort Sample',         desc:'Mira needs {{count}} Nullwort samples from near the Void traces.',           target:'void_herb', count:[1,2]  },
  { type:'KILL',    title:'Shadow Assassins',        desc:'Killers from the Shadow Realm lurk near the trade road. Kill {{count}}.',     target:'enemy', count:[3,4]    },
  { type:'EXPLORE', title:'The Dragon\'s Maw',       desc:'A lair has been found in the volcanic peaks. Explore and survive.',           target:'tile',  count:[1]      },
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

    // ── New dungeon themes ────────────────────────────────────────────────────
    NECROPOLIS: { name:'The Necropolis',     wallColor:0x1a0f0f, floorColor:0x100808, fogDensity:0.06, enemyBias:['BONE_GIANT','SKELETON','SPECTRAL_ARCHER','NECROMANCER_ADEPT'], bossTypes:['BONE_TYRANT'],    bgColor:0x060303 },
    ICE_TOMB:   { name:'Frozen Tomb',        wallColor:0x0a1820, floorColor:0x081015, fogDensity:0.05, enemyBias:['ICE_ELEMENTAL','CRYSTAL_WRAITH','PHANTOM'],                    bossTypes:['CRYSTAL_TITAN'],  bgColor:0x030810 },
    VOID_CITADEL:{ name:'Void Citadel',      wallColor:0x080015, floorColor:0x04000c, fogDensity:0.08, enemyBias:['VOID_HORROR','VOID_ELEMENTAL','SOUL_REAVER','VOID_STALKER'],   bossTypes:['VOID_EMPRESS'],   bgColor:0x030008 },
    SEWERS:     { name:'Old City Sewers',    wallColor:0x101810, floorColor:0x0a120a, fogDensity:0.06, enemyBias:['PLAGUE_RAT','BANDIT','SHADOW_ASSASSIN','SWAMP_TROLL'],         bossTypes:['THE_AMALGAM'],    bgColor:0x040804 },
    DRAGON_LAIR:{ name:'Dragon\'s Maw',      wallColor:0x2a1000, floorColor:0x1e0800, fogDensity:0.04, enemyBias:['EMBER_DRAKE','DRAKE','BERSERKER','GOLEM'],                    bossTypes:['NIGHTMARE_DRAKE'],bgColor:0x0f0400 },
    RUINS:      { name:'The Shattered Ruins',wallColor:0x1a1808, floorColor:0x100e06, fogDensity:0.04, enemyBias:['CORRUPTED_PALADIN','BANDIT','ANCIENT_GOLEM','GHOST'],          bossTypes:['CORRUPTED_ELDER'],bgColor:0x080704 },
  },

  WORLD_SEED: 42,

  // ── Gathering skill definitions ─────────────────────────────────────────────
  GATHERING_SKILLS: {
    mining: {
      name: 'Mining', icon: '⛏',
      nodes: [
        { id:'copper_rock',  name:'Copper Rock',   level:1,  xp:35,  yield:'iron_ore',    color:0x886655, requires:'bronze_pick'  },
        { id:'iron_rock',    name:'Iron Rock',     level:10, xp:55,  yield:'iron_ore',    color:0x888899, requires:'iron_pick'    },
        { id:'coal_seam',    name:'Coal Seam',     level:20, xp:50,  yield:'coal',        color:0x333333, requires:'iron_pick'    },
        { id:'mithril_vein', name:'Mithril Vein',  level:40, xp:115, yield:'mithril_ore', color:0x5577bb, requires:'mithril_pick' },
        { id:'runite_rock',  name:'Runite Rock',   level:55, xp:160, yield:'runite_ore',  color:0x4488ff, requires:'mithril_pick' },
      ],
    },
    woodcut: {
      name: 'Woodcutting', icon: '🪓',
      nodes: [
        { id:'tree',         name:'Tree',          level:1,  xp:25,  yield:'oak_log',     color:0x556633, requires:'bronze_axe'  },
        { id:'oak_tree',     name:'Oak Tree',      level:15, xp:38,  yield:'oak_log',     color:0x4a6644, requires:'iron_axe'    },
        { id:'yew_tree',     name:'Yew Tree',      level:30, xp:87,  yield:'yew_log',     color:0x335533, requires:'iron_axe'    },
        { id:'magic_tree',   name:'Magic Tree',    level:50, xp:135, yield:'magic_log',   color:0x3355aa, requires:'mithril_axe' },
        { id:'ancient_tree', name:'Ancient Tree',  level:40, xp:105, yield:'ancientwood', color:0x557755, requires:'mithril_axe' },
      ],
    },
    fishing: {
      name: 'Fishing', icon: '🎣',
      nodes: [
        { id:'pond',         name:'Fishing Pond',  level:1,  xp:20,  yield:'raw_fish',    color:0x3355aa, requires:'fishing_rod' },
        { id:'river',        name:'River Spot',    level:15, xp:35,  yield:'raw_fish',    color:0x3366cc, requires:'fishing_rod' },
        { id:'deep_pool',    name:'Deep Pool',     level:30, xp:65,  yield:'raw_shark',   color:0x224488, requires:'fly_rod'     },
        { id:'void_pool',    name:'Void Pool',     level:45, xp:95,  yield:'raw_shark',   color:0x330066, requires:'fly_rod'     },
      ],
    },
    herbalism: {
      name: 'Herbalism', icon: '🌿',
      nodes: [
        { id:'herb_patch',   name:'Herb Patch',    level:1,  xp:18,  yield:'herb',        color:0x44aa44, requires:'herb_knife'  },
        { id:'void_herb_node',name:'Void Trace',   level:20, xp:55,  yield:'void_herb',   color:0x884488, requires:'herb_knife'  },
        { id:'flax_field',   name:'Flax Field',    level:10, xp:25,  yield:'flax',        color:0xbbdd88, requires:'herb_knife'  },
      ],
    },
    hunting: {
      name: 'Hunting', icon: '🏹',
      nodes: [
        { id:'rabbit_burrow',name:'Rabbit Burrow', level:1,  xp:15,  yield:'rabbit',      color:0xddccaa, requires:'hunting_bow' },
        { id:'wolf_den',     name:'Wolf Den',      level:20, xp:40,  yield:'wolf_meat',   color:0xaaaaaa, requires:'hunting_bow' },
        { id:'drake_nest',   name:'Drake Nest',    level:40, xp:85,  yield:'dragonscale', color:0x882200, requires:'hunting_bow' },
      ],
    },
  },

  // XP required to reach each gathering level (RuneScape-inspired curve)
  GATHERING_XP_TABLE: (() => {
    const t = [0, 0];
    for (let lvl = 2; lvl <= 99; lvl++) {
      let total = 0;
      for (let l = 1; l < lvl; l++) {
        total += Math.floor(l + 300 * Math.pow(2, l / 7));
      }
      t[lvl] = Math.floor(total / 4);
    }
    return t;
  })(),

  // ── Slayer task pool ─────────────────────────────────────────────────────────
  SLAYER_TASKS: [
    { target:'GOBLIN',           count:[20,30,40], pts:5,  minLevel:1,  reward:{ gold:80,  item:'potion'     } },
    { target:'SPIDER',           count:[15,25,35], pts:6,  minLevel:5,  reward:{ gold:100, item:'antidote'   } },
    { target:'SKELETON',         count:[15,25,30], pts:8,  minLevel:5,  reward:{ gold:120, item:'scroll'     } },
    { target:'WOLF',             count:[15,20,30], pts:7,  minLevel:8,  reward:{ gold:110, item:'hide'       } },
    { target:'BANDIT',           count:[10,18,25], pts:10, minLevel:10, reward:{ gold:150, item:'chainmail'  } },
    { target:'WRAITH',           count:[8,15,20],  pts:12, minLevel:12, reward:{ gold:180, item:'crystal'    } },
    { target:'TROLL',            count:[6,10,15],  pts:14, minLevel:14, reward:{ gold:220, item:'gem'        } },
    { target:'CULTIST',          count:[8,12,18],  pts:12, minLevel:14, reward:{ gold:200, item:'scroll'     } },
    { target:'DRAKE',            count:[5,8,12],   pts:20, minLevel:18, reward:{ gold:350, item:'dragonscale'} },
    { target:'LICH',             count:[4,6,10],   pts:22, minLevel:20, reward:{ gold:400, item:'soulstone'  } },
    { target:'BERSERKER',        count:[5,8,12],   pts:18, minLevel:16, reward:{ gold:300, item:'axe'        } },
    { target:'GOLEM',            count:[4,6,8],    pts:20, minLevel:20, reward:{ gold:360, item:'gem'        } },
    { target:'VOID_STALKER',     count:[4,6,8],    pts:25, minLevel:22, reward:{ gold:420, item:'voidessence'} },
    { target:'SOUL_REAVER',      count:[3,5,8],    pts:28, minLevel:24, reward:{ gold:480, item:'soulstone'  } },
    { target:'BONE_GIANT',       count:[3,4,6],    pts:30, minLevel:26, reward:{ gold:550, item:'crystal'    } },
    { target:'EMBER_DRAKE',      count:[3,5,7],    pts:32, minLevel:28, reward:{ gold:600, item:'dragonscale'} },
    { target:'VOID_HORROR',      count:[2,3,5],    pts:40, minLevel:30, reward:{ gold:700, item:'voidessence'} },
    { target:'ANCIENT_GOLEM',    count:[2,3,4],    pts:45, minLevel:32, reward:{ gold:800, item:'ancientwood'} },
    { target:'VOID_ELEMENTAL',   count:[3,5,7],    pts:38, minLevel:28, reward:{ gold:650, item:'crystal'    } },
    { target:'CORRUPTED_PALADIN',count:[3,5,6],    pts:35, minLevel:26, reward:{ gold:580, item:'gem'        } },
  ],

  // ── Slayer shop (spend points) ────────────────────────────────────────────────
  SLAYER_SHOP: [
    { id:'slayer_helm',   name:'Slayer Helm',     pts:50,  item:'ring_power',     desc:'+10% damage on Slayer tasks'        },
    { id:'broad_arrows',  name:'Broad Arrows ×50',pts:35,  item:'gem',            desc:'Arrows effective against all Slayer targets' },
    { id:'void_salve',    name:'Void Salve',      pts:40,  item:'nullwort_tea',   desc:'Heals VOID_CURSE and fully restores HP' },
    { id:'ring_slayer',   name:'Ring of Slaying', pts:80,  item:'amulet_soul',    desc:'Teleport to Slayer Master instantly' },
    { id:'perm_ember',    name:'Ember Heart',     pts:120, item:'voidessence',    desc:'Unlock Dragon\'s Maw dungeon permanently' },
    { id:'soulbound',     name:'Soulbound Permit',pts:150, item:'soulstone',      desc:'Unlock Void Citadel dungeon permanently' },
  ],

  // ── Gathering node world positions ────────────────────────────────────────────
  // Relative to map centre (128, 128). These are approximate spawn regions.
  GATHER_REGIONS: {
    mining:    [{ x:155, z:100 }, { x:162, z:88  }, { x:170, z:105 }],
    woodcut:   [{ x:100, z:140 }, { x:110, z:155 }, { x:95,  z:148 }],
    fishing:   [{ x:120, z:160 }, { x:135, z:168 }, { x:128, z:145 }],
    herbalism: [{ x:148, z:150 }, { x:140, z:160 }, { x:155, z:158 }],
    hunting:   [{ x:90,  z:110 }, { x:80,  z:125 }, { x:98,  z:100 }],
  },
};
