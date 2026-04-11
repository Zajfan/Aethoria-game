# Aethoria — Game Design Document v0.1
**Genre:** Top-down Action RPG (browser-based, single-player with shared world seed)
**Engine:** Vanilla JS + Three.js (3D dungeon), Phaser-style custom tile world
**Tone:** Classic fantasy — epic, atmospheric, lore-rich. Dark enough to feel dangerous, not grimdark.
**Inspiration:** RuneScape (progression loop, world feel), Diablo II (loot, dungeon depth), Zelda (exploration, NPCs with real personalities)

---

## 🌍 The Premise

> *Three hundred years ago, the Crystal Crown was shattered. Five shards scattered across Aethoria. The kingdoms fell — not to war, but to forgetting.*
>
> *Hearthmoor is one of the last settlements still standing. You arrived this morning. Nobody remembers why. Elder Lyra looked at you for a long time before she spoke.*
>
> *"There's something different about you," she said. "The Voidlords will notice it too."*
>
> *Somewhere out there are five Crown Shards. Somewhere out there is an answer to what the scholar promised the Voidlords when she invited them in. And somewhere between those two facts is the thing that ends this.*
>
> *Start with the goblins. Work your way up.*

---

## 🗺️ World Structure

### The Overworld
A 256×256 tile procedurally generated world (fixed seed 42 — every player sees the same terrain). The world is divided into 5 named regions tied to the lore:

| Region | Terrain | Threat Level | Lore Hook |
|---|---|---|---|
| **Elandor Plains** | Grass, paths, villages | Low | Farmland corrupted by Void traces |
| **Whispering Marshes** | Fog, wetlands, herbs | Medium | Spirits, forbidden knowledge, lost scholars |
| **Shattered Coast** | Cliffs, sea temples, pirate strongholds | Medium-High | Ancient sea temples, Crown Shard 3 |
| **Ashveil Peaks** | Volcanic crags, dwarven ruins | High | Fire elementals, forgotten prophecy, Crown Shard 4 |
| **Crystal Wastes** | Frozen desert, Void corruption | Endgame | Lich King's domain, Crown Shard 5 |

### Hearthmoor (Hub)
The player's base of operations. A living village with 5 named NPCs who react to world events, give quests, and unlock systems:

- **Elder Lyra** — Story gatekeeper. Knows about the Sealing, the Voidlords, the Crown. Reveals information as the player proves themselves.
- **Gareth (Blacksmith)** — Crafting system. Lost his arm at the Battle of the Ember Road. Unlocks advanced recipes when given boss materials.
- **Mira (Herbalist)** — Potions and consumables. Discovered Nullwort near Void traces. Has not told anyone what it does.
- **Dorin (Merchant)** — Rare items and trade. Has been inside a Void Gate and returned. Will not explain how.
- **Capt. Vel (Guard)** — Combat quests and bounties. Has held the line at four settlements before Hearthmoor. Each of them eventually fell.

### Dungeons
Procedurally generated 3D dungeons (Three.js) with 5 themed environments:

| Theme | Setting | Enemy Bias | Boss |
|---|---|---|---|
| **Forgotten Crypt** | Dark stone, fog | Skeleton, Archer, Lich | Void Knight |
| **Corrupted Forest** | Green corruption | Spider, Wolf, Marsh Phantom | Forest Ancient |
| **Ashveil Depths** | Volcanic, lava glow | Drake, Golem, Berserker | Stone Colossus |
| **Void Rift** | Reality tearing | Wraith, Cultist, Lich | Void Herald |
| **Sunken Vaults** | Waterlogged ruin | Phantom, Spider, Cultist | Lich King |

---

## 🧙 Player Systems

### Character Classes
Three archetypes, chosen at character creation:

| Class | Playstyle | Unique Mechanics |
|---|---|---|
| **Warrior** | Frontline brawler. High HP, melee. | Slam AoE, Battlecry kill-stacks, Execute threshold burst |
| **Mage** | Ranged glass cannon. | Fireball, Chain Lightning, Void Touch, Mana Shield |
| **Ranger** | Mobile skirmisher. | Swift Shot, Evasion dodge-teleport, Poison stacks, Death Mark opener |

### Skill Trees
3-tier skill trees per class. 8 skills per class (3 Tier 1, 3 Tier 2, 2 Tier 3). Tier 2 requires a Tier 1 skill at rank 2+. Tier 3 requires two Tier 2 skills at rank 2+.

**Skill points:** 1 per level. Rank cost scales (rank 1 = 1pt, rank 2 = 2pt, rank 3 = 3pt, etc.)

### Stats
- **HP / Max HP** — Survives combat. Warriors get +40 base, Mages get -10.
- **Attack** — Damage output. Mages get +8 base.
- **Defense** — Damage reduction. Warriors get +6 base.
- **Speed** — Movement speed. Rangers get +25 base.
- **Attack Range** — Melee vs. ranged capability. Skills can extend.
- **Attack Cooldown** — Time between attacks. Rangers can reduce significantly.

### Progression
- **XP per level:** 100 base (scales)
- **Levels:** No hard cap — progression slows naturally
- **Loot rarity:** Common → Uncommon → Rare → Epic → Legendary
- **Drop multipliers:** Legendary = 0.008 base rate. Boss kills improve drop table.

---

## ⚔️ Combat

### Overworld Combat
Real-time. Player auto-attacks on proximity. Enemies pathfind toward player. Special abilities (Slam, Fireball, Poison Arrow) have cooldowns and are activated manually.

**Status effects:**
- **Burn** — Drake attacks. Damage over time.
- **Poison** — Spider/Ranger. Stacks up to 3×.
- **Slow** — Frost Bolt, Trapper. Movement reduction.
- **Void Curse** — Wraith/Cultist/Void Touch skill. Void damage amplification.
- **Ethereal** — Marsh Phantom. Reduced physical damage taken.

### Dungeon Combat (3D)
Same mechanics in a 3D environment. Claustrophobic corridors force different positioning. Boss encounters have scripted phase transitions:
- Each boss has 2-3 phases triggered at HP thresholds.
- Phase changes show a narrative message and alter behavior (speed, attack pattern, summons).

---

## 📦 Items & Economy

### Item Tiers
| Rarity | Color | Drop Rate | XP Multiplier |
|---|---|---|---|
| Common | Grey | 100% | 1.0× |
| Uncommon | Green | 35% | 1.3× |
| Rare | Blue | 15% | 1.8× |
| Epic | Purple | 5% | 2.5× |
| Legendary | Gold | 0.8% | 5.0× |

### Item Types
- **Weapons** — Iron Sword → Runesword → Voidblade → Crown Shard Blade
- **Armor** — Leather → Chainmail → Plate Mail → Void Plate → Crown Shard Guard
- **Consumables** — Healing Herb (25hp), Potion (65hp), Elixir (150hp), Antidote, Mana Potion, Rejuvenation
- **Materials** — Used in crafting. Bones, Hide, Gem, Void Crystal, Dragonscale, Soulstone
- **Currencies** — Gold Coins (20), Silver Coins (5)
- **Readables** — Lore Scrolls. Expand world lore when read.

### Crafting (at Gareth's Forge)
Recipes combine materials into equipment. Unlock recipes by:
1. Reaching certain levels
2. Bringing Gareth specific boss materials
3. Story progression with Gareth's personal questline

**Current recipes (sample):**
- `herb×2` → Health Potion
- `herb×3 + gem×1` → Grand Elixir
- `sword×1 + gem×1` → Longsword
- `longsword×1 + crystal×1` → Runesword
- `hide×6 + crystal×1` → Dragonhide armor

---

## 📖 Story — The Crystal Crown

### Main Quest Arc
5-act structure following Crown Shard collection, one per major region:

**Act 1 — The Plains (Tutorial)**
*"Learn that the world is broken."*
- Establish Hearthmoor, meet NPCs
- Crown Shard 1 is beneath the ruins north of the village
- Defeated enemy: Void Knight (first boss, dungeon introduction)
- Reveal: Elder Lyra performed the Sealing at personal cost she won't discuss

**Act 2 — The Marshes**
*"Learn that knowledge has a price."*
- Mira's questline: Nullwort investigation
- Crown Shard 2 is in the Sunken Vaults dungeon
- Defeated enemy: Lich King (first encounter)
- Reveal: Dorin's impossible journey — he went through a Void Gate. He brought something back.

**Act 3 — The Coast**
*"Learn that some doors shouldn't be opened."*
- Capt. Vel's questline: the Battle of Ember Road, what really happened
- Crown Shard 3 in a sea temple beneath the Shattered Coast
- Defeated enemy: Void Herald
- Reveal: The scholar who invited the Voidlords was looking for a way to escape death. She succeeded.

**Act 4 — The Peaks**
*"Learn what the Voidlords actually are."*
- Gareth's questline: his replica Crown, why it doesn't work, why that matters
- Crown Shard 4 in the Ashveil Depths dungeon
- Defeated enemy: Stone Colossus (created to guard the shard)
- Reveal: The Voidlords were promised the Crown. All five shards. In exchange for showing the scholar how to escape death.

**Act 5 — The Crystal Wastes**
*"Decide what to do with what you know."*
- Final region. The Crystal Wastes. Endgame enemies everywhere.
- Crown Shard 5 held by the Lich King
- Final boss: The Lich King, full encounter
- Endgame choice: **Restore the Crown** (send the Voidlords back, honor the scholar's deal) or **Shatter it Again** (destroy the deal, destroy the Voidlords, and the scholar's immortality with it)

### NPC Questlines (parallel to main quest)
Each NPC has a 3-quest personal chain that enriches lore and gives unique rewards:

| NPC | Quest Theme | Unique Reward |
|---|---|---|
| Elder Lyra | The true cost of the Sealing | Reveals what she sacrificed — passive Void resistance |
| Gareth | Why the replica Crown fails | Unlocks master-tier crafting recipes |
| Mira | What Nullwort actually does | Unlocks rare potion recipes + the truth about Void corruption |
| Dorin | What he brought back from the Gate | Unique item: the thing he took from the Gate |
| Capt. Vel | What her standing order actually says | Combat bonus: +15% attack vs. Void enemies |

---

## 🌤️ Dynamic Systems

### Day/Night Cycle
240-second full cycle. Visual shift (lighting, fog density). Night increases enemy spawn rate +30%. Some enemies only appear at night.

### Weather
6 states cycling randomly: Clear (×3 weight), Rain, Fog, Storm.
- **Fog** — Vision radius reduced
- **Storm** — Movement speed reduced, lightning strikes damage enemies occasionally
- **Rain** — Mire terrain becomes impassable temporarily

### Quests
Procedurally generated from templates, tied to named enemy types, collection goals, or exploration targets. Quest board in Hearthmoor refreshes daily. NPC-specific quests are hand-authored.

---

## 📅 Roadmap

### v0.1 ✅ Foundation
- Core world generation (seed-based, 256×256)
- Player movement, combat, basic enemy AI
- Three classes, basic skill system
- Item system, crafting, loot drops
- 5 NPC archetypes with bio text
- Day/night cycle, weather
- 3D dungeon (DungeonScene3D), 2 boss encounters
- Void Crystal crafting chain

### v0.2 — Story Foundation (current)
- [ ] NPC dialogue system — reactive to player stats/quests
- [ ] Act 1 main quest (Crown Shard 1, Void Knight)
- [ ] Gareth's personal questline (3 quests)
- [ ] Lore Scroll readable system
- [ ] World map UI — named regions visible
- [ ] Save/load system (localStorage with cloud backup hook)

### v0.3 — Content Expansion
- [ ] Act 2 (Marshes, Sunken Vaults, Lich King first encounter)
- [ ] Mira questline
- [ ] Dorin questline
- [ ] Corrupted Forest dungeon theme live
- [ ] All 5 dungeon themes accessible
- [ ] 5 boss encounters complete
- [ ] Full skill tree UI rewrite (tree visualization, not list)

### v0.4 — Systems Depth
- [ ] Act 3 & 4 (Coast + Peaks)
- [ ] Capt. Vel questline
- [ ] Lyra questline
- [ ] Enchanting system (add affixes to equipment)
- [ ] Player housing (upgradeable base in Hearthmoor)
- [ ] World events (Void corruption spreading — time-limited objectives)
- [ ] Achievement system

### v0.5 — Endgame
- [ ] Act 5 (Crystal Wastes)
- [ ] Lich King full encounter (3-phase)
- [ ] Endgame choice — branching ending
- [ ] New Game+ mode
- [ ] Legendary item hunt (specific boss drops, not just RNG)

### v0.6 — Multiplayer Foundation
- [ ] Shared world state via backend
- [ ] Other player presence (visible in overworld)
- [ ] Co-op dungeon entry
- [ ] Player trading
- [ ] Hearthmoor community board (player-generated quests)
