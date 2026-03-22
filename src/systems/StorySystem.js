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
  { id:'sq10',giver:'Capt. Vel',  title:'Reinforcement Needed',        desc:'Three waves of enemies have probed the walls. Kill 6 wolves, 4 goblins.',          type:'KILL',    target:'multi',   needed:10, reward:{ xp:400, gold:180, item:'shield' } },
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
    if (cw.level && this.scene.player?.stats.level < cw.level)          done = false;
    if (cw.shard && this.shards < cw.shard)                             done = false;
    if (cw.talked_to_lyra && !this.flags.talked_to_lyra)                done = false;
    if (cw.boss_killed && !this.flags['boss_' + cw.boss_killed])        done = false;

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
