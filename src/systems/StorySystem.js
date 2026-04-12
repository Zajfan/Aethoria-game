import { AIMemory   } from './AIMemory.js';
import { LORE       } from './LoreDatabase.js';

// ── Act definitions ────────────────────────────────────────────
export const ACTS = [
  {
    id: 0, name: 'Prologue',
    title: 'A Stranger in Hearthmoor',
    desc: 'You arrive with nothing. Learn the village, meet its people, survive your first night.',
    requirement: null,
    complete_when: { talked_to_lyra: true, level: 2 },
  },
  {
    id: 1, name: 'Act I',
    title: 'The Dawning Shard',
    desc: 'Elder Lyra reveals the truth about Hearthmoor. The first shard lies in the ruins beneath the old temple.',
    requirement: { act: 0 },
    complete_when: { shard: 1 },
  },
  {
    id: 2, name: 'Act II',
    title: 'Roots of Shadow',
    desc: 'The forest is changing. Something stirs in the Elderwood shrine. Gareth says the second shard is calling to the iron in his forge.',
    requirement: { act: 1, level: 5 },
    complete_when: { shard: 2 },
  },
  {
    id: 3, name: 'Act III',
    title: 'The Gate Below',
    desc: 'The dungeon holds more than monsters. The Void Knight guards the third shard — and a secret about who sent him there.',
    requirement: { act: 2, level: 8, boss_killed: 'Void Knight' },
    complete_when: { shard: 3 },
  },
  {
    id: 4, name: 'Act IV',
    title: 'Storm and Reckoning',
    desc: 'The fourth shard reveals Lyra\'s true history. The village turns on her. You must choose.',
    requirement: { act: 3, level: 12 },
    complete_when: { shard: 4 },
  },
  {
    id: 5, name: 'Act V',
    title: 'The Last Shard',
    desc: 'The fifth shard is in the Void itself. Lyra will show you the way — and tell you what she has never told anyone.',
    requirement: { act: 4, level: 18 },
    complete_when: { shard: 5 },
  },
  {
    id: 6, name: 'Act VI',
    title: 'The Void Bleeds Back',
    desc: 'The Crown is restored — but the Void does not close quietly. Shards of the old gate rupture across Aethoria. Something vast and patient begins to wake.',
    requirement: { act: 5, level: 22 },
    complete_when: { boss_killed: 'Bone Tyrant', level: 25 },
  },
  {
    id: 7, name: 'Act VII',
    title: 'The Fractured Kingdoms',
    desc: 'The old kingdoms remember themselves. Ruins fill with their original defenders — and their original enemies. The Void Empress leads the second incursion.',
    requirement: { act: 6, level: 25 },
    complete_when: { boss_killed: 'The Void Empress', level: 30 },
  },
  {
    id: 8, name: 'Act VIII',
    title: 'Aethoria Reborn',
    desc: 'The Amalgam — a fusion of every Voidlord ever denied passage — rises from the deep gate. Lyra says only the one who chose to put on the Crown can stop it.',
    requirement: { act: 7, level: 30 },
    complete_when: { boss_killed: 'The Amalgam' },
  },
];

// ── Main quest chain (6 quests per act) ──────────────────────
export const STORY_QUESTS = [
  // Act 0 — Prologue
  { id:'p1', act:0, giver:'Elder Lyra',  title:'First Steps',           desc:'Speak to Elder Lyra at the village center. She has been expecting someone like you.',    type:'TALK',    target:'Elder Lyra',  needed:1, reward:{ xp:50,  gold:10 } },
  { id:'p2', act:0, giver:'Gareth',      title:'Earning Your Keep',     desc:'The blacksmith Gareth needs 3 animal hides. Prove you can handle yourself.',              type:'COLLECT', target:'hide',        needed:3, reward:{ xp:80,  gold:20 } },
  { id:'p3', act:0, giver:'Mira',        title:'Something is Wrong',    desc:'Mira has noticed the goblin attacks are increasing. Kill 5 goblins near the village.',     type:'KILL',    target:'Goblin',      needed:5, reward:{ xp:100, gold:30, item:'potion' } },
  { id:'p4', act:0, giver:'Elder Lyra',  title:'The Well\'s Secret',   desc:'Draw water from the old well in the village center, then return to Lyra.',                type:'EXPLORE', target:'well',        needed:1, reward:{ xp:120, gold:0 } },
  { id:'p5', act:0, giver:'Capt. Vel',  title:'Night Watch',           desc:'Survive until dawn. The nights have been growing stranger.',                               type:'SURVIVE', target:'night',       needed:1, reward:{ xp:150, gold:40 } },
  { id:'p6', act:0, giver:'Elder Lyra',  title:'The Truth of Aethoria', desc:'Return to Elder Lyra. She says she is ready to tell you what she has never told anyone.', type:'TALK',    target:'Elder Lyra',  needed:1, reward:{ xp:200, gold:0, unlocks_act:1 } },

  // Act I — The Dawning Shard
  { id:'a1_1', act:1, giver:'Elder Lyra', title:'The Broken Crown',      desc:'Lyra explains the Crystal Crown. Find the first shard in the ruins east of Hearthmoor.', type:'SHARD',   target:'shard_1',  needed:1, reward:{ xp:300, gold:50 } },
  { id:'a1_2', act:1, giver:'Gareth',     title:'An Appropriate Weapon', desc:'You need a proper blade. Bring Gareth 2 bones and 2 hides to forge you something real.', type:'COLLECT', target:'material', needed:4, reward:{ xp:180, gold:0,  item:'sword' } },
  { id:'a1_3', act:1, giver:'Mira',       title:'The Healing Price',     desc:'The Void traces are poisoning the water. Bring 4 herbs to purify the well.',             type:'COLLECT', target:'herb',     needed:4, reward:{ xp:200, gold:60 } },
  { id:'a1_4', act:1, giver:'Dorin',      title:'A Map of Ruin',         desc:'Dorin has a map of the old kingdoms. Recover it from a skeleton that took it.',          type:'KILL',    target:'Skeleton', needed:3, reward:{ xp:240, gold:80 } },
  { id:'a1_5', act:1, giver:'Capt. Vel', title:'Thinning the Herd',     desc:'The goblin clan east of town has grown bold. Kill their 8 strongest scouts.',            type:'KILL',    target:'Goblin',   needed:8, reward:{ xp:280, gold:90 } },
  { id:'a1_6', act:1, giver:'Elder Lyra', title:'First Light',           desc:'The first shard has been found. Return it to Lyra at the old well.',                      type:'SHARD',   target:'shard_return', needed:1, reward:{ xp:400, gold:0, unlocks_act:2 } },

  // Act II — Roots of Shadow
  { id:'a2_1', act:2, giver:'Elder Lyra', title:'The Elderwood',        desc:'The forest east of the dungeon portal holds the second shard. The trees will resist you.', type:'EXPLORE', target:'forest', needed:1, reward:{ xp:500, gold:100 } },
  { id:'a2_2', act:2, giver:'Gareth',     title:'Void Iron',            desc:'Gareth needs void crystal from a Troll to continue his research. Hunt one down.',          type:'KILL',    target:'Troll',  needed:2, reward:{ xp:420, gold:120 } },
  { id:'a2_3', act:2, giver:'Mira',       title:'Nullwort',             desc:'Mira asks you to find a grey herb near Void traces. She will not say why she needs it.',   type:'COLLECT', target:'crystal',needed:2, reward:{ xp:380, gold:0, item:'elixir' } },
  { id:'a2_4', act:2, giver:'Dorin',      title:'The Last Caravan',     desc:'Dorin knows where a supply cache was left by the last caravan. Fight through 6 wolves.',   type:'KILL',    target:'Wolf',   needed:6, reward:{ xp:400, gold:150 } },
  { id:'a2_5', act:2, giver:'Capt. Vel', title:'Something Came Back',  desc:'Vel saw something enter the village at night that should not be alive. Investigate.',      type:'KILL',    target:'Skeleton',needed:5, reward:{ xp:450, gold:100 } },
  { id:'a2_6', act:2, giver:'Gareth',     title:'The Iron Crown',       desc:'Gareth finally shows you what he built. He needs one gem to complete it.',                type:'COLLECT', target:'gem',    needed:2, reward:{ xp:600, gold:0, item:'chainmail', unlocks_act:3 } },

  // Act III — The Gate Below
  { id:'a3_1', act:3, giver:'Elder Lyra', title:'Into the Dungeon',     desc:'The third shard is in the dungeon. So is the Void Knight. Lyra says do not talk to it.', type:'DUNGEON', target:'dungeon',    needed:1, reward:{ xp:800, gold:200 } },
  { id:'a3_2', act:3, giver:'Capt. Vel', title:'No One Returns',       desc:'Three guards went into the dungeon last week. Vel needs to know what happened.',          type:'DUNGEON', target:'dungeon',    needed:1, reward:{ xp:700, gold:180 } },
  { id:'a3_3', act:3, giver:'Gareth',    title:'Void Steel',           desc:'The Void Knight carries a blade Gareth has never seen. Bring back a fragment of it.',     type:'BOSS',    target:'Void Knight',needed:1, reward:{ xp:900, gold:0, item:'axe' } },
  { id:'a3_4', act:3, giver:'Mira',      title:'What the Dark Does',   desc:'Mira needs samples from inside the dungeon. Three bone samples from skeletons there.',    type:'DUNGEON', target:'dungeon',    needed:1, reward:{ xp:750, gold:0, item:'elixir' } },
  { id:'a3_5', act:3, giver:'Dorin',     title:'Debt Uncollected',     desc:'Dorin says he left something in the dungeon three years ago. He wants it back.',          type:'DUNGEON', target:'dungeon',    needed:1, reward:{ xp:800, gold:250 } },
  { id:'a3_6', act:3, giver:'Elder Lyra','title':'What He Said',       desc:'After the Void Knight fell, Lyra needs to know what, if anything, it said to you.',       type:'TALK',    target:'Elder Lyra', needed:1, reward:{ xp:1200,gold:0, unlocks_act:4 } },

  // Act IV — Storm and Reckoning: The fourth shard reveals Lyra's true history
  { id:'a4_1', act:4, giver:'Elder Lyra',  title:'The Name He Said',
    desc:"The Void Knight said Lyra's name before it died. She needs a moment. Then she tells you everything.",
    type:'TALK',    target:'Elder Lyra',  needed:1, reward:{ xp:1500, gold:0 } },

  { id:'a4_2', act:4, giver:'Capt. Vel',  title:'The Village Reacts',
    desc:'Word spreads. Half the village believes Lyra opened the Gate. Vel needs the situation contained before it turns violent. Talk to 3 upset villagers.',
    type:'TALK',    target:'villager',    needed:3, reward:{ xp:1200, gold:200 } },

  { id:'a4_3', act:4, giver:'Dorin',      title:'The Shard of Storm',
    desc:"Dorin's maps show the fourth shard at the lightning-struck spire on the Eastern Cliffs. Something enormous nests there now.",
    type:'KILL',    target:'Drake',       needed:3, reward:{ xp:1600, gold:300 } },

  { id:'a4_4', act:4, giver:'Gareth',     title:'The Iron Crown Responds',
    desc:"When the third shard returned, the Iron Crown on Gareth's forge wall lit up. Now it pulses with the fourth. Retrieve it from him — he won't let go willingly.",
    type:'TALK',    target:'Gareth',      needed:1, reward:{ xp:1400, gold:0, item:'crystal' } },

  { id:'a4_5', act:4, giver:'Sister Vashe', title:'What the Veilbound Know',
    desc:"Vashe in Saltmere has translated the Void Gate inscription. She says there's a fifth shard and she knows where. She wants something in return: 3 Void Crystals.",
    type:'COLLECT', target:'crystal',     needed:3, reward:{ xp:1800, gold:400 } },

  { id:'a4_6', act:4, giver:'Elder Lyra',  title:'She Confesses',
    desc:"Lyra admits everything. The gate. The pact. The three hundred years. She asks you one question: knowing all of it, will you still return the last shard?",
    type:'TALK',    target:'Elder Lyra',  needed:1, reward:{ xp:2000, gold:0, unlocks_act:5 } },

  // Act V — The Last Shard: The fifth shard is in the Void itself
  { id:'a5_1', act:5, giver:'Elder Lyra',  title:'The Way In',
    desc:"Lyra opens the old gate — not the one in the dungeon, the real one, sealed for three hundred years beneath the well. You go in first.",
    type:'DUNGEON', target:'dungeon',     needed:1, reward:{ xp:2500, gold:0 } },

  { id:'a5_2', act:5, giver:'Capt. Vel',  title:'Hold the Line',
    desc:'Something comes through the gate behind you. Vel holds it. Kill everything that emerges before the village falls.',
    type:'KILL',    target:'Wraith',      needed:8, reward:{ xp:2200, gold:500 } },

  { id:'a5_3', act:5, giver:'Elder Lyra',  title:'The Herald Rises',
    desc:'Deep in the Void Rift dungeon, the Void Herald guards the fifth shard. Kill it. The gate will close when the shard is returned. Probably.',
    type:'BOSS',    target:'Void Herald', needed:1, reward:{ xp:3000, gold:0, item:'voidessence' } },

  { id:'a5_4', act:5, giver:'Elder Lyra',  title:'The Fifth Shard',
    desc:'You have it. Return to Lyra at the old well. The Crown can be restored. She is waiting. She has been waiting for three hundred years.',
    type:'SHARD',   target:'shard_5',     needed:1, reward:{ xp:3500, gold:1000 } },

  { id:'a5_5', act:5, giver:'Elder Lyra',  title:'Dawn or Dusk',
    desc:'The Crown is whole. Lyra says: put it on and heal the leylines, or give it to her and let her undo what she did. Your choice. One ending or the other.',
    type:'TALK',    target:'Elder Lyra',  needed:1, reward:{ xp:5000, gold:2000, unlocks_act:6 } },

  { id:'a5_6', act:5, giver:'Elder Lyra',  title:'What Comes After',
    desc:"Aethoria is changed. Lyra is finally still. You are whatever you chose to be. The village remains. The well still needs water drawn from it every day. Some things do not change.",
    type:'EXPLORE', target:'well',        needed:1, reward:{ xp:2000, gold:0 } },

  // ── Act VI — The Void Bleeds Back ─────────────────────────────────────────────
  { id:'a6_1', act:6, giver:'Elder Lyra', title:'The Gate Did Not Close',
    desc:"Lyra stands at the old well at dawn. She says: I can feel them through the stone. The Crown sealed the main gate but not the fragments. There are seven of them.",
    type:'TALK', target:'Elder Lyra', needed:1, reward:{ xp:4000, gold:0 } },

  { id:'a6_2', act:6, giver:'Master Theron', title:'The Necropolis Stirs',
    desc:"Theron has heard reports from the east road: dead things walking in formation, directed. Not random. The Necropolis beneath the old city is active. He wants scouts — dead scouts coming back from there.",
    type:'KILL', target:'BONE_GIANT', needed:4, reward:{ xp:4500, gold:600 } },

  { id:'a6_3', act:6, giver:'Sister Vashe', title:'Fragment Resonance',
    desc:"Vashe detects seven resonance spikes — void-gate fragments embedded in the world. She can close them if she has enough Void Essence to power the ritual. She needs 5.",
    type:'COLLECT', target:'voidessence', needed:5, reward:{ xp:5000, gold:500, item:'spectral_robe' } },

  { id:'a6_4', act:6, giver:'Capt. Vel', title:'Hold Hearthmoor',
    desc:"A Bone Tyrant leads a column of undead toward the village. Vel holds the north road. You hold the east. Kill everything that reaches the gate.",
    type:'KILL', target:'BONE_GIANT', needed:6, reward:{ xp:5500, gold:700 } },

  { id:'a6_5', act:6, giver:'Aldric', title:'The Tyrant\'s Name',
    desc:"Aldric says the Bone Tyrant was a king — Verath's last. He wants to know if it still speaks. Face it in the Necropolis. Listen to what it says before you kill it.",
    type:'BOSS', target:'Bone Tyrant', needed:1, reward:{ xp:7000, gold:0, item:'soulstone' } },

  { id:'a6_6', act:6, giver:'Elder Lyra', title:'Echoes of Verath',
    desc:"The Bone Tyrant is dead. Three fragments sealed. Lyra plays back what it said — in her memory, because she was there when it was alive. The Act is not over.",
    type:'TALK', target:'Elder Lyra', needed:1, reward:{ xp:6000, gold:1000, unlocks_act:7 } },

  // ── Act VII — The Fractured Kingdoms ─────────────────────────────────────────
  { id:'a7_1', act:7, giver:'Sister Vashe', title:'The Empress Speaks',
    desc:"Vashe intercepts a void-message. The Empress is not here yet. She is sending heralds — Void Elementals carrying her voice. Destroy them before they reach enough minds.",
    type:'KILL', target:'VOID_ELEMENTAL', needed:5, reward:{ xp:7000, gold:800 } },

  { id:'a7_2', act:7, giver:'High Priestess Solara', title:'The Order\'s Last Light',
    desc:"Solara says three Order temples fell before she fled. The Shattered Ruins hold the last functioning Sealed Sun altar. She needs you to clear the Corrupted Paladins guarding it.",
    type:'KILL', target:'CORRUPTED_PALADIN', needed:6, reward:{ xp:8000, gold:900, item:'aegis_of_dawn' } },

  { id:'a7_3', act:7, giver:'Gareth', title:'The Iron Crown Works',
    desc:"Something changed when the real Crown was restored. Gareth's replica lit up. It works now. He does not know what it does — he hands it to you and says he is going to go sit down for a while.",
    type:'TALK', target:'Gareth', needed:1, reward:{ xp:6500, gold:0, item:'amulet_fury' } },

  { id:'a7_4', act:7, giver:'Master Theron', title:'Void Citadel Advance',
    desc:"The Empress is building something in the Void Citadel. Soul Reavers reinforce it. Theron wants the reinforcements stopped before the structure completes.",
    type:'KILL', target:'SOUL_REAVER', needed:8, reward:{ xp:9000, gold:1000 } },

  { id:'a7_5', act:7, giver:'Elder Lyra', title:'A Promise Collected',
    desc:"The Voidlords send the Empress because they are owed something. Lyra finally says what she promised them: a successor. Someone who can bear the weight of the Crown forever. She is looking at you when she says this.",
    type:'TALK', target:'Elder Lyra', needed:1, reward:{ xp:10000, gold:0 } },

  { id:'a7_6', act:7, giver:'Sister Vashe', title:'Kill the Empress',
    desc:"The Void Citadel is open. The Empress waits at its centre. She knows your name. She knew it before you arrived. Kill her anyway.",
    type:'BOSS', target:'The Void Empress', needed:1, reward:{ xp:15000, gold:2000, item:'voidplate', unlocks_act:8 } },

  // ── Act VIII — Aethoria Reborn ────────────────────────────────────────────────
  { id:'a8_1', act:8, giver:'Elder Lyra', title:'What Was Promised',
    desc:"Lyra tells you everything she told the Voidlords. The price. The timeline. The loophole she found after two hundred years of searching. She says there is a way out. One of you has to take it.",
    type:'TALK', target:'Elder Lyra', needed:1, reward:{ xp:12000, gold:0 } },

  { id:'a8_2', act:8, giver:'Aldric', title:'The Amalgam Rising',
    desc:"Aldric tracks the signature: every Voidlord that ever lost a piece of itself to this world has fused into one. The Amalgam. It rises from the old deep gate under the well. Every soul it consumes makes it larger.",
    type:'KILL', target:'VOID_HORROR', needed:6, reward:{ xp:12000, gold:1200 } },

  { id:'a8_3', act:8, giver:'Capt. Vel', title:'The Last Stand',
    desc:"Vel says: I am not telling you to come back from this. I am telling you to go anyway. Every sword arm in Hearthmoor is on the wall. You are the only one who can reach the Amalgam's core.",
    type:'DUNGEON', target:'dungeon', needed:1, reward:{ xp:14000, gold:0, item:'ring_void' } },

  { id:'a8_4', act:8, giver:'High Priestess Solara', title:'The Final Sealing',
    desc:"Solara channels the last of the Order's power into you. It will not last long. The Amalgam's defenses are weakening. This is the moment.",
    type:'BOSS', target:'The Amalgam', needed:1, reward:{ xp:25000, gold:5000, item:'crownblade' } },

  { id:'a8_5', act:8, giver:'Elder Lyra', title:'The Loophole',
    desc:"The Amalgam is dead. Lyra stands in the well chamber. She says: the loophole is you. They wanted a successor who would bear the Crown forever. The Crown is restored. The Voidlords have what they asked for. So do we.",
    type:'TALK', target:'Elder Lyra', needed:1, reward:{ xp:20000, gold:0 } },

  { id:'a8_6', act:8, giver:'Elder Lyra', title:'Draw Water',
    desc:"It is morning. The well still needs water drawn from it every day. You are still the one drawing it. The Voidlords are gone. Lyra is finally, impossibly, at rest. Aethoria remains. So do you.",
    type:'EXPLORE', target:'well', needed:1, reward:{ xp:10000, gold:10000, item:'crownguard' } },
];

// ── Side quests (always available, repeatable pool) ───────────
export const SIDE_QUESTS = [
  { id:'sq1', giver:'Capt. Vel',  title:'Bounty: The Grey Wolf',       desc:'A particularly large wolf has been stalking the road. Bounty for its fang.',      type:'KILL',    target:'Wolf',    needed:1,  reward:{ xp:180, gold:80,  item:'fang'    } },
  { id:'sq2', giver:'Gareth',     title:'Supply Run',                   desc:'Gareth is out of quality hide. Bring him 5 hides from the field.',                type:'COLLECT', target:'hide',    needed:5,  reward:{ xp:150, gold:70               } },
  { id:'sq3', giver:'Mira',       title:'Deep Forest Herbs',            desc:'Herbs near Void traces are more potent. Collect 4 from dangerous areas.',         type:'COLLECT', target:'herb',    needed:4,  reward:{ xp:160, gold:60,  item:'potion'  } },
  { id:'sq4', giver:'Dorin',      title:'Lost Shipment',                desc:'A crate of gems was dropped when Dorin fled wolves. Recover 2 gems.',             type:'COLLECT', target:'gem',     needed:2,  reward:{ xp:220, gold:100              } },
  { id:'sq5', giver:'Capt. Vel',  title:'Skeleton Patrol',              desc:'The eastern ruins are overrun. Clear 10 skeletons before the next watch.',        type:'KILL',    target:'Skeleton',needed:10, reward:{ xp:300, gold:120              } },
  { id:'sq6', giver:'Mira',       title:'Troll Bile',                   desc:'Disgusting but effective. Mira needs a Troll defeated for a reagent sample.',     type:'KILL',    target:'Troll',   needed:1,  reward:{ xp:350, gold:140, item:'elixir'  } },
  { id:'sq7', giver:'Gareth',     title:'The Old Forge',                desc:'Somewhere in the dungeon there is an ancient forge. Gareth wants proof of it.',   type:'DUNGEON', target:'dungeon', needed:1,  reward:{ xp:500, gold:200, item:'axe'    } },
  { id:'sq8', giver:'Elder Lyra', title:'Eyes Open',                   desc:'The world is larger than Hearthmoor. Explore beyond the dungeon portal and return.',type:'EXPLORE',target:'portal',  needed:1,  reward:{ xp:250, gold:0                } },
  { id:'sq9', giver:'Dorin',      title:'Moving Stock',                 desc:'Help Dorin sell by killing 8 goblins — they have been raiding his supply runs.',  type:'KILL',    target:'Goblin',  needed:8,  reward:{ xp:280, gold:160              } },
  { id:'sq10', giver:'Capt. Vel',    title:'Reinforcement Needed',      desc:'Three waves of enemies have probed the walls. Kill 6 wolves, 4 goblins.',         type:'KILL',    target:'multi',    needed:10, reward:{ xp:400,  gold:180, item:'shield'    } },

  // ── New side quests — gathering and crafting ──────────────────────────────
  { id:'sq11', giver:'Gareth',      title:'Iron for the Forge',         desc:'The smithy is running dry. Mine 6 iron ore from the old quarry north of the village.', type:'COLLECT', target:'iron_ore',  needed:6,  reward:{ xp:300,  gold:150, item:'iron_bar'  } },
  { id:'sq12', giver:'Gareth',      title:'Mithril Whispers',           desc:'Gareth heard rumours of mithril ore near the Crystal Wastes. Bring back 4 pieces.',    type:'COLLECT', target:'mithril_ore',needed:4, reward:{ xp:600,  gold:400, item:'mithril_bar'} },
  { id:'sq13', giver:'Mira',        title:'The Flax Run',               desc:'The herbalist needs flax to spin into bandages. Collect 8 from the riverside field.',  type:'COLLECT', target:'flax',      needed:8,  reward:{ xp:200,  gold:80               } },
  { id:'sq14', giver:'Mira',        title:'Cook for the Sick',          desc:'Three villagers are recovering. Bring 4 cooked fish to the healer\'s hut.',            type:'COLLECT', target:'cooked_fish',needed:4, reward:{ xp:250,  gold:100, item:'potion'   } },
  { id:'sq15', giver:'Dorin',       title:'Timber Contract',            desc:'Dorin needs 8 oak logs to repair his trading cart.',                                   type:'COLLECT', target:'oak_log',   needed:8,  reward:{ xp:300,  gold:120               } },
  { id:'sq16', giver:'Dorin',       title:'Yew for the War Bows',       desc:'Capt. Vel commissioned hunting bows for the guard. Bring Dorin 5 yew logs.',          type:'COLLECT', target:'yew_log',   needed:5,  reward:{ xp:500,  gold:250, item:'hunting_bow'} },

  // ── New side quests — new NPCs ────────────────────────────────────────────
  { id:'sq17', giver:'Sister Vashe',title:'Void Trace Mapping',         desc:'Vashe needs someone to locate void traces in the east ruins. Explore the area.',      type:'EXPLORE', target:'ruins',     needed:1,  reward:{ xp:600,  gold:200, item:'crystal'  } },
  { id:'sq18', giver:'Sister Vashe',title:'Crystal Harvest',            desc:'Vashe requires 3 void crystals for her translation work. Dangerous ones near Drakes.', type:'COLLECT', target:'crystal',   needed:3,  reward:{ xp:800,  gold:350               } },
  { id:'sq19', giver:'Master Theron',title:'First Blood',               desc:'Take your first Slayer task and complete it. Report back to Theron.',                 type:'KILL',    target:'GOBLIN',    needed:15, reward:{ xp:500,  gold:200, item:'herb_knife'} },
  { id:'sq20', giver:'Master Theron',title:'Dragon Scale Contract',     desc:'A Drake nest was found in the volcanic peaks. Theron wants 4 dragonscales.',         type:'COLLECT', target:'dragonscale',needed:4, reward:{ xp:900,  gold:500, item:'dragonhide'} },
  { id:'sq21', giver:'Aldric',      title:'Bone Harvest',               desc:'Aldric studies undead anatomy. Bring 8 fresh bone samples from the Necropolis.',      type:'COLLECT', target:'bones',     needed:8,  reward:{ xp:700,  gold:300, item:'bone_staff'} },
  { id:'sq22', giver:'Aldric',      title:'The Spectral Archer Problem',desc:'Spectral Archers haunt the road to the ruins. Aldric wants 5 destroyed for study.',   type:'KILL',    target:'SPECTRAL_ARCHER',needed:5,reward:{ xp:900,  gold:350, item:'scroll'  } },
  { id:'sq23', giver:'High Priestess Solara','title':'Cleanse the Shrine',desc:'A corrupted Sealed Sun shrine lies east of Hearthmoor. Clear the Cultists defiling it.', type:'KILL', target:'CULTIST', needed:8, reward:{ xp:1000, gold:400, item:'holy_water'} },
  { id:'sq24', giver:'High Priestess Solara','title':'Paladin\'s Trial', desc:'Solara demands proof of conviction: kill the Corrupted Paladin that guards the old temple.', type:'KILL',target:'CORRUPTED_PALADIN',needed:3, reward:{ xp:1200, gold:500, item:'blessed_shield'} },

  // ── New side quests — endgame ─────────────────────────────────────────────
  { id:'sq25', giver:'Capt. Vel',   title:'Void Stalker Hunt',          desc:'Something invisible has been killing sentries. Vel needs 4 Void Stalkers dead.',       type:'KILL',    target:'VOID_STALKER',needed:4, reward:{ xp:1400, gold:600, item:'amulet_soul'} },
  { id:'sq26', giver:'Gareth',      title:'The Ancient Golem\'s Core',  desc:'Gareth believes the Ancient Golem has a workable heart at its centre. Kill one.',      type:'KILL',    target:'ANCIENT_GOLEM',needed:2, reward:{ xp:1800, gold:800, item:'ring_power'} },
  { id:'sq27', giver:'Mira',        title:'Nullwort Purification',      desc:'Mira finally knows what Nullwort does. She needs 3 gathered to brew the antidote.',    type:'COLLECT', target:'void_herb',  needed:3,  reward:{ xp:1200, gold:0,  item:'nullwort_tea'} },
  { id:'sq28', giver:'Dorin',       title:'The Forty-Third Settlement', desc:'Dorin found a map of a settlement that might still exist. Explore the old ruins.',     type:'EXPLORE', target:'ruins',     needed:1,  reward:{ xp:1500, gold:700, item:'scroll'   } },
  { id:'sq29', giver:'Elder Lyra',  title:'Three Hundred Years',        desc:'Lyra asks you to sit with her at the well. She wants to say the names she has never said aloud.', type:'TALK', target:'Elder Lyra', needed:1, reward:{ xp:3000, gold:0 } },
  { id:'sq30', giver:'Sister Vashe','title':'Sealbreaker\'s Codex',    desc:'Vashe recovered a Voidlord codex from the Void Citadel. It describes three unknown seal locations.', type:'EXPLORE', target:'dungeon', needed:1, reward:{ xp:2500, gold:1000, item:'amulet_void'} },
];

export class StorySystem {
  constructor(scene) {
    this.scene       = scene;
    this.act         = 0;           // current act (0 = prologue)
    this.flags       = {};          // story flags (talked_to_lyra, etc.)
    this.shards      = 0;           // shards collected
    this.shardFlags  = {};          // which specific shards collected
    this.activeStory = [];          // active main quest ids
    this.doneSide    = new Set();   // completed side quest ids
    this.activeSide  = [];          // active side quest ids
    this.revealedLore = new Set();  // codex entries unlocked
  }

  // ── Act progression ───────────────────────────────────────
  checkActProgress() {
    const actData = ACTS[this.act];
    if (!actData) return;

    const cw = actData.complete_when;
    let done = true;
    if (cw.level      && this.scene.player?.stats.level < cw.level)  done = false;
    if (cw.shard      && this.shards < cw.shard)                      done = false;
    if (cw.talked_to_lyra && !this.flags.talked_to_lyra)              done = false;
    if (cw.boss_killed && !this.flags['boss_' + cw.boss_killed])      done = false;

    if (done && this.act < ACTS.length - 1) {
      this.advanceAct();
    }
  }

  advanceAct() {
    this.act++;
    const actData = ACTS[this.act];
    if (!actData) return;

    AIMemory.recordEvent('act', actData.name);
    this.scene.events.emit('actAdvanced', actData);

    // Unlock next story quests
    const newQuests = STORY_QUESTS.filter(q => q.act === this.act);
    if (newQuests.length > 0) {
      const first = newQuests[0];
      this.activeStory.push(first.id);
      this.scene.events.emit('storyQuestAdded', first);
    }

    // Offer new side quests
    this._refreshSideQuests();
  }

  // ── Shard collection ─────────────────────────────────────
  collectShard(shardId) {
    if (this.shardFlags[shardId]) return;
    this.shardFlags[shardId] = true;
    this.shards++;
    AIMemory.recordEvent('shard', shardId);
    this.revealedLore.add('shard_' + shardId);
    this.scene.events.emit('shardCollected', { id: shardId, total: this.shards });
    this.scene.events.emit('achievement', { name: `Shard ${this.shards}/5`, desc: LORE.shards[shardId-1]?.name || 'Shard found' });
    this.checkActProgress();
  }

  // ── Story quest progression ──────────────────────────────
  flagSet(flagName) {
    this.flags[flagName] = true;
    this.checkActProgress();
    this.scene.events.emit('storyFlagSet', flagName);
  }

  completeStoryQuest(questId) {
    this.activeStory = this.activeStory.filter(id => id !== questId);
    const quest = STORY_QUESTS.find(q => q.id === questId);
    if (!quest) return;
    if (quest.reward?.unlocks_act) this.checkActProgress();
    // Advance to next quest in act
    const actQuests = STORY_QUESTS.filter(q => q.act === quest.act);
    const idx = actQuests.findIndex(q => q.id === questId);
    if (idx >= 0 && idx < actQuests.length - 1) {
      const next = actQuests[idx + 1];
      this.activeStory.push(next.id);
      this.scene.events.emit('storyQuestAdded', next);
    }
    this.scene.events.emit('storyQuestDone', quest);
  }

  // ── Side quests ───────────────────────────────────────────
  _refreshSideQuests() {
    const available = SIDE_QUESTS.filter(q =>
      !this.doneSide.has(q.id) &&
      !this.activeSide.includes(q.id) &&
      this.activeSide.length < 3
    );
    if (available.length === 0) return;
    const pick = available[Math.floor(Math.random() * available.length)];
    this.activeSide.push(pick.id);
    this.scene.events.emit('sideQuestAdded', pick);
  }

  getSideQuestByGiver(giverName) {
    return SIDE_QUESTS.filter(q =>
      q.giver === giverName &&
      !this.doneSide.has(q.id) &&
      !this.activeSide.includes(q.id)
    )[0] || null;
  }

  completeSideQuest(questId) {
    this.activeSide = this.activeSide.filter(id => id !== questId);
    this.doneSide.add(questId);
    const quest = SIDE_QUESTS.find(q => q.id === questId);
    if (quest?.reward) {
      const p = this.scene.player;
      if (p) {
        p.gainXP(quest.reward.xp || 0);
        if (quest.reward.gold) { p.stats.gold = (p.stats.gold||0) + quest.reward.gold; }
        if (quest.reward.item) p.addItem(quest.reward.item);
        this.scene.events.emit('statsChanged', p.stats);
      }
    }
    this.scene.events.emit('sideQuestDone', quest);
    this._refreshSideQuests();
  }

  // ── Lore unlocking ────────────────────────────────────────
  unlockLore(entryId) {
    if (this.revealedLore.has(entryId)) return;
    this.revealedLore.add(entryId);
    this.scene.events.emit('loreUnlocked', entryId);
  }

  getActiveStoryQuests() {
    return this.activeStory.map(id => STORY_QUESTS.find(q => q.id === id)).filter(Boolean);
  }
  getActiveSideQuests() {
    return this.activeSide.map(id => SIDE_QUESTS.find(q => q.id === id)).filter(Boolean);
  }
  getCurrentAct() { return ACTS[this.act]; }

  // ── Persistence ───────────────────────────────────────────
  serialize() {
    return {
      act: this.act, flags: this.flags, shards: this.shards,
      shardFlags: this.shardFlags, activeStory: this.activeStory,
      doneSide: [...this.doneSide], activeSide: this.activeSide,
      revealedLore: [...this.revealedLore],
    };
  }
  deserialize(d) {
    if (!d) return;
    this.act          = d.act         || 0;
    this.flags        = d.flags       || {};
    this.shards       = d.shards      || 0;
    this.shardFlags   = d.shardFlags  || {};
    this.activeStory  = d.activeStory || [];
    this.doneSide     = new Set(d.doneSide || []);
    this.activeSide   = d.activeSide  || [];
    this.revealedLore = new Set(d.revealedLore || []);
  }
}
