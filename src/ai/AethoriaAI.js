/**
 * AethoriaAI.js  (v1.0 — Fully Scripted Dialogue, no API calls)
 *
 * All NPC responses are handcrafted for lore consistency and immersion.
 * No Anthropic API calls are made. The game direction shifted to solo + co-op;
 * NPC behaviour is coded here, not generated at runtime.
 *
 * Public API (unchanged — NPC3D and other callers need no modification):
 *   AethoriaAI.chat(systemPrompt, history, npcName, worldCtx) → Promise<string>
 *   AethoriaAI.generateGreeting(npcName, playerState, worldCtx) → Promise<string|null>
 *   AethoriaAI.announceWorldEvent(event) → Promise<string>
 */

import { CONFIG } from '../config.js';

// ── Topic keyword map ──────────────────────────────────────────────────────────
// Maps a topic key → array of trigger words found in player input.

const TOPIC_KEYS = {
  greeting:    ['hello', 'hi ', 'good day', 'greet', 'approach', 'i approach', 'salut', 'hey'],
  crown:       ['crown', 'crystal', 'shard', 'shards', 'crystals', 'king'],
  void:        ['void', 'voidlord', 'darkness', 'corruption', 'shadow', 'rift', 'corrupt', 'dark'],
  sealing:     ['seal', 'sealing', 'ritual', 'pact', 'barrier', 'ward', 'sealed'],
  craft:       ['forge', 'craft', 'smith', 'weapon', 'armor', 'armour', 'make', 'build', 'recipe'],
  heal:        ['heal', 'herb', 'potion', 'medicine', 'hurt', 'injured', 'sick', 'wound', 'health', 'cure'],
  trade:       ['buy', 'sell', 'trade', 'item', 'shop', 'price', 'gold', 'cost', 'stock'],
  threat:      ['threat', 'enemy', 'guard', 'danger', 'attack', 'raid', 'goblin', 'monster', 'safe'],
  undead:      ['undead', 'skeleton', 'dead', 'death', 'lich', 'necromancer', 'corpse', 'zombie', 'spirit', 'ghost'],
  order:       ['order', 'sealed sun', 'divine', 'holy', 'temple', 'priestess', 'prayer', 'consecrate'],
  inscription: ['inscription', 'gate', 'portal', 'writing', 'text', 'rune', 'translate'],
  slayer:      ['task', 'contract', 'hunt', 'slay', 'bounty', 'assignment', 'points', 'slayer'],
  lore:        ['history', 'lore', 'ancient', 'old', 'story', 'tell me', 'what happened', 'legend'],
  self:        ['yourself', 'who are', 'about you', 'your past', 'your story', 'where are you from'],
  quest:       ['quest', 'mission', 'what should', 'what do', 'where should', 'how do', 'work for'],
};

// ── Per-NPC scripted dialogue pools ───────────────────────────────────────────

const DIALOGUE = {

  'Elder Lyra': {
    greetings: {
      default: [
        'You came. I wondered if you would.',
        'Sit with me a moment. There are things I need to say carefully.',
        'Ah. Still alive. Good.',
        'I have been watching the road. Come — there is much to discuss.',
        'I hoped it would be you. Not blindly — I have been watching you.',
      ],
      night: [
        'The night tells truths the day refuses to. Come, sit.',
        'I do not sleep much any more. You should rest — but since you are here...',
        'At night I can feel the Sealing breathe. It is not as strong as it was.',
      ],
      act_high: [
        'You have come far. Further than I expected, if I am honest.',
        'The shards you carry... I can feel them from here. They remember the Crown.',
      ],
    },
    topics: {
      crown: [
        'The Crystal Crown was not merely a symbol. It was a lock. When it shattered, what it held back began to seep through.',
        'Five shards. Five wounds in the world. You will need to find each one — and you will not enjoy what guards them.',
        'The Crown was built to be unbreakable. The fact that it broke tells you something about who broke it.',
        'Gareth has spent twenty years trying to rebuild it. The replica is beautiful and completely inert. He is missing something. So am I.',
        'When you gather the fifth shard — come to me first. Before you do anything with them. Please.',
        'Each shard carries a memory of the Crown. Do not be surprised if you hear things when you hold them.',
      ],
      void: [
        'The Void is not evil. It is hungry. There is a difference. Understanding that difference may save your life.',
        'They were invited. That is the part that keeps me awake. Someone held the door open.',
        'Do not let Void-touched wounds go untreated. The corruption is patient.',
        'I have felt the Void for sixty years. It does not get easier. You build scar tissue around it.',
        'The Voidlords remember everything. That is their advantage. We must use what they cannot — forgetting, mercy, hope.',
        'The Void is a place with geography. I have never been there. I know it the way a lighthouse keeper knows the sea.',
      ],
      sealing: [
        'The Sealing holds this village alive. What it cost me is not relevant. What matters is that it will not hold forever.',
        'I used the last of something to perform the Sealing. I did not know it was the last. I know now.',
        'Some mornings I walk the perimeter and I can feel the edges fraying. You need to move faster than you think.',
        'There was a scholar three hundred years ago. She made a pact and called it wisdom. I sealed what she opened. We are both equally responsible for this world\'s wound.',
        'The Sealing was not the Order\'s technique. It was older. I have never told anyone where I learned it.',
      ],
      lore: [
        'Three hundred years. The Crown shattered, the kingdoms forgot themselves, and the world became smaller. We are what is left.',
        'The Voidlords had names once, before they chose what they chose. I know one of those names. I have never spoken it aloud.',
        'The founding scholars of Aethoria built the Crown as an insurance policy. They were not wrong to do so. They were wrong about everything else.',
        'There is a record of the invitation. Not in any library — in the stone of the Void Gate itself. Vashe is translating it. I am afraid of what she will find.',
      ],
      self: [
        'I am old enough that the interesting parts of my past are also the parts I cannot speak of.',
        'You want to know who I was before Hearthmoor? Someone who made a very large mistake and has spent sixty years correcting it.',
        'I was young when the Crown shattered. I was not young when I understood what I had done.',
        'The Sealing cost me something I cannot name. Not because it has no name — because naming it would require admitting what I traded.',
      ],
      quest: [
        'Go east of the dungeon entrance. There is something that should not be there — a light that moves without wind.',
        'Gareth needs materials he cannot ask for himself. Boss remnants. Help him without being asked.',
        'The path north grows dark. Someone should walk it who knows what to look for. That may be you.',
        'The first shard is near water. Deep water. You will know it by the stillness around it — nothing living wants to be close.',
      ],
    },
    idle: [
      'The seals hold. For now.',
      'You carry more than you know. As do we all.',
      'Come back when you have found the first shard. We will talk then.',
      'There is something in your eyes I have not seen in a long time. Purpose.',
      'Tell me what you have seen out there. I need to know.',
      'The world is smaller than it used to be. Or perhaps the dark is larger.',
      'Sixty years is a long time to hold something together. I am very tired.',
    ],
  },

  'Gareth': {
    greetings: {
      default: [
        'Back again. Good. I have work for you.',
        'You look like you\'ve been in a fight. Welcome.',
        'Don\'t just stand there. Talk or leave, I\'m busy.',
        'Hmm. Alive. Better than last time you looked.',
        'I was just thinking about you. I need something retrieved.',
      ],
      night: [
        'The forge runs all night. I don\'t need much else.',
        'Night is when the metal speaks clearly. What do you want?',
      ],
    },
    topics: {
      craft: [
        'Forging left-handed took three years to learn properly. I don\'t half-do things.',
        'Bring me iron and I\'ll show you what iron can become. Bring me Void Crystal and I\'ll show you something better.',
        'The replica doesn\'t work. I know it doesn\'t work. I keep trying because the day I stop is the day the Void wins.',
        'Good steel remembers how it was shaped. Bad steel forgets. People are the same.',
        'Bring boss drops to me. I can use materials most people consider junk. There is no such thing as waste at a real forge.',
        'The void-touched metals take heat differently. They absorb it. That should be impossible.',
        'Fourteen attempts at the replica. Each time it\'s perfect. Each time it\'s completely dead.',
      ],
      crown: [
        'I\'ve rebuilt it fourteen times. Each time it\'s perfect. Each time it\'s completely dead.',
        'Lyra says I\'m missing something. She won\'t tell me what. That is not a useful conversation.',
        'The Crown was forged in Void-touched metal. That\'s the part I can\'t replicate. Don\'t tell Lyra I know that.',
        'I\'ll finish the replica. It just needs the right component. I\'m still looking.',
        'Every smith worth anything has a thing they\'ve never quite finished. This is mine. Except it matters more than most.',
      ],
      void: [
        'I lost this arm to a void-corrupted golem. Not the Void itself — just something it touched. Think about that.',
        'Void-touched metal is the strongest I\'ve ever worked. Also the most dangerous. Also I want it.',
        'The corruption doesn\'t spread to metal. Only living things. That is the one mercy I count on.',
        'Something big is moving near the east ridge. I\'ve heard it three nights running. Not animals.',
      ],
      self: [
        'Battle of the Ember Road. Look it up — assuming the records survived, which they didn\'t.',
        'I lost the arm. Kept everything else. Most of the people I fought with can\'t say the same.',
        'I was a soldier. Then I was a smith. The second requires more precision. I prefer it.',
        'Grief makes you either give up or get precise. I chose precise.',
      ],
      quest: [
        'The bone giant dropped something when you killed it. I want it. Bring it to me and name your price.',
        'There\'s a vein of void-touched ore three days east. I need someone to dig it who won\'t lose their mind.',
        'Kill the Golem in the lower dungeon. Not for a bounty — for the core. I need the core.',
        'Bring me Dragonscale and I\'ll make you something that isn\'t on any list.',
      ],
      threat: [
        'Something big is moving near the east ridge. I\'ve heard it three nights running.',
        'The goblins aren\'t the problem. They\'re a symptom. Something smarter is pushing them toward us.',
        'Sharpen your weapon before you go out. Obvious advice. You\'d be surprised how often it gets ignored.',
      ],
    },
    idle: [
      'Sharp edge needs a patient hand. Remember that.',
      'Bring me boss materials. I have ideas that need testing.',
      'Left-handed or not, I can still outwork any smith in this realm.',
      'Don\'t let what happened to the last group happen to you.',
      'Fourteen attempts. Fourteen. I will find what it needs.',
      'The forge is loud. That\'s fine. Loud means working.',
    ],
  },

  'Mira': {
    greetings: {
      default: [
        'You look like you need at least one potion. Come here.',
        'Good timing. I just finished sorting the Nullwort. Don\'t ask what it does yet.',
        'Alive and standing. My personal standard for a good day.',
        'Sit down. Let me look at you properly.',
        'I was wondering when you\'d be back. Sit.',
      ],
      night: [
        'Night is when the herbs are most potent. And when I do my best thinking.',
        'I work better when everyone else is asleep. Less to worry about.',
      ],
    },
    topics: {
      heal: [
        'Healing isn\'t just closing wounds. It\'s making the body remember what whole feels like.',
        'Rest. Water. Food. In that order. Everything I give you is supplementary to those three.',
        'The void-touched injuries don\'t heal normally. I have something that helps. It\'s not comfortable.',
        'I\'ve lost patients who thought they were fine. I take "fine" very seriously as a diagnosis.',
        'Nullwort accelerates healing on the physical plane and does something else entirely on the others. I am still documenting what.',
        'Come to me before you need me, not after. That is the only instruction I give everyone.',
      ],
      herb: [
        'Nullwort. That is all I will say for now.',
        'The plants near the dungeon entrance have changed. Something in the soil. I keep coming back to that.',
        'Every herb has a memory. It grows where something happened. Pay attention to where things grow.',
        'I discovered Nullwort by accident — looking for something to treat Void corruption. I found something more complicated.',
        'Three herbs that shouldn\'t coexist are growing within ten feet of each other near the eastern shrine. I would very much like to know why.',
        'The Nullwort grows near the Void Gate. Everything that grows there should be wrong. The Nullwort is... not wrong.',
      ],
      void: [
        'The Void does something to organic matter. Not corruption — integration. It tries to make living things part of itself.',
        'I tested Nullwort on myself. I do not recommend that approach, but the data is unambiguous.',
        'The corruption moves faster in cold. Slower in firelight. I don\'t know why. I\'m working on it.',
        'Mira\'s note on Void wounds: debride, pack with Nullwort extract, cover. Do not leave it open. The corruption is drawn to open things.',
      ],
      trade: [
        'The potions on the left shelf are mine. The ones on the right are store-bought and I take no responsibility for them.',
        'Nullwort tea cures almost everything. I have three doses. Not for sale — except extreme circumstances.',
        'Tell me what you need. I may not have it, but I\'ll know who does.',
        'I keep the rarer reagents locked. Not from you — from everyone. Some of what I have should not be used carelessly.',
      ],
      self: [
        'I remember every patient. Every name. I don\'t remember the name of my birth village. The Forgetting took it.',
        'I became a herbalist because the alternative was soldier or farmer. Herbs made more sense to me than swords or soil.',
        'I am afraid. Every day, I am afraid. I continue anyway. That is what being a healer requires.',
        'The Forgetting is what the Voidlords leave behind. I have a small piece of it inside me. I use it to understand what I\'m treating.',
      ],
      quest: [
        'I need samples from the dungeon — specifically from the third level. The plants there are unlike anything in my records.',
        'There\'s a wounded wolf near the eastern ridge. Not aggressive — sick. I need you to bring it back or put it down humanely.',
        'A traveler came through with symptoms I haven\'t seen before. I need you to find out where they came from.',
      ],
    },
    idle: [
      'Have you been eating? No, never mind — have you been sleeping?',
      'The herbs near the dungeon entrance have changed. Something in the soil.',
      'There\'s a difference between brave and reckless. I patch up both, but only one comes back.',
      'Nullwort. That is all I will say for now.',
      'I\'ve been trying to write down everything I know about Void corruption. It\'s becoming a very long document.',
      'Come back when you need healing. Come back even when you don\'t.',
    ],
  },

  'Dorin': {
    greetings: {
      default: [
        'Welcome, welcome! What can I get you? Within reason, of course.',
        'Town number forty. Still standing. Some days that surprises me.',
        'Ah — you again. Good. Familiar faces are rare commodities.',
        'Just restocked. Terrible timing on my part, probably. Come look.',
        'I had a feeling you\'d be by. I set something aside.',
      ],
      night: [
        'The night trade is quieter. I prefer it, if I\'m honest.',
        'Most of my best deals happen after dark. Something about the hour makes people more honest.',
      ],
    },
    topics: {
      trade: [
        'I can get you anything. For the right price. The question is what you can afford to pay.',
        'Some prices are not in gold. Bear that in mind.',
        'The rarest items don\'t have a market price. They have a story price.',
        'I\'ve been in forty-three settlements. I know what sells everywhere and what sells nowhere. Ask me.',
        'The eastern trade routes have been quiet for three weeks. Either peace, or something has stopped the merchants from talking. I\'m betting the second.',
        'I don\'t carry everything in the open. Tell me what you really need.',
      ],
      void: [
        'I went through the Void Gate. I came back. Both of those things should not have happened.',
        'Something in the Void knows my name. It has known it since I came back. I don\'t discuss that openly.',
        'Town number forty-four is gone. It was a Void rift, not a raid. I watched it happen from a hill.',
        'The things you can bring back from the Void have weight that has nothing to do with mass. I know this from experience.',
        'I reach for something at my side sometimes. I left it in the Void, or it followed me out. I\'m not sure which.',
      ],
      lore: [
        'The Void Gate inscription — I have a copy. Made it before I went through. Some of it describes what\'s on the other side.',
        'The thirty-nine lost towns all had one thing in common. I\'ve never told anyone what it was. Maybe I should start.',
        'There\'s a merchant who\'s been to every settlement I\'ve visited. I only ever see him after they fall. I\'ve stopped asking his name.',
        'Someone in Hearthmoor knows more about the Voidlords than they\'re saying. I\'ve been in enough falling towns to recognise that expression.',
      ],
      threat: [
        'Something is disrupting trade routes east of here. Not bandits — bandits are predictable. This avoids being seen.',
        'The supply of Void Crystal coming out of the east has tripled in six months. That should worry you more than it worries me.',
        'Three caravans, three weeks, no arrivals from the north. Something has changed on that road.',
      ],
      self: [
        'Town number forty. I keep hoping this one has better odds than the last thirty-nine.',
        'Thirty-nine of the towns I\'ve visited are gone. I keep maps of where they were. I don\'t know why. Habit.',
        'The merchant\'s life is simple: move, sell, move again. It stops being simple when the places you\'re moving between start disappearing.',
        'I came back from the Void Gate carrying something I did not bring in. I sold it eventually. I still wonder who bought it.',
      ],
      quest: [
        'I need something retrieved from Crossroads Station. A box. Don\'t open it. Don\'t ask what\'s in it.',
        'There\'s a buyer for Void Crystal I cannot approach directly. I need an intermediary. The work is safe. Probably.',
        'The caravan from the north hasn\'t arrived in three weeks. I need to know if it\'s coming or not.',
      ],
    },
    idle: [
      'Town number forty. I keep hoping this one has better odds.',
      'I can get you anything — for the right price. The question is what you can afford to pay.',
      'Some prices are not in gold. Bear that in mind.',
      'Something in the east has been quiet lately. That worries me more than the noise.',
      'I reached for my pack this morning and it was gone. I had it last night. That sort of thing happens more often now.',
      'The Void Gate is not a door you open once. Everything you do after is still the other side.',
    ],
  },

  'Capt. Vel': {
    greetings: {
      default: [
        'Status report. What have you seen out there?',
        'You\'re back. Good. I need information.',
        'One question before anything else: did you see anything on the road?',
        'I was about to send someone to find you. Walk with me.',
      ],
      night: [
        'Night patrol found something. I want your read on it.',
        'The walls are thinner at night. Not physically. Come here.',
      ],
    },
    topics: {
      threat: [
        'Three goblins at the east ridge last night. Not a patrol — a scouting formation. Someone is directing them.',
        'The walls hold. The perimeter holds. What keeps me up at night is the stuff that doesn\'t come over walls.',
        'I\'ve defended four settlements. This is the one that has Lyra. That changes the calculation.',
        'The eastern approach has twelve blind spots. I\'ve covered eleven. The twelfth requires someone faster than my guards.',
        'Goblin raids are increasing in frequency, not ferocity. That pattern means something else is pushing them here.',
        'The things moving out of the Crystal Wastes aren\'t animals. They move like they have orders.',
      ],
      void: [
        'Two of my patrol had Void corruption symptoms. Rotated to non-combat. Mira is treating them.',
        'I don\'t understand the Void tactically. So I plan for everything it might do, not just what it will. It\'s expensive preparation.',
        'Standing order: if a Void Rift opens inside the walls, we don\'t fight it. We evacuate. I will enforce that personally.',
        'The void-touched enemies respond differently to formation tactics. I\'ve had to rewrite our defensive protocols twice.',
      ],
      self: [
        'Four settlements. I\'ve held three when it mattered. One I didn\'t. I keep a list.',
        'Three of my guards deserted last week. I haven\'t reported it. I understand why they left. I don\'t forgive it.',
        'I follow orders from Lyra. She gave me one I\'ve never spoken aloud. I will carry it out when the time comes.',
        'The job is to hold the line. I\'ve been doing the job for twelve years. I intend to keep doing it.',
      ],
      lore: [
        'Lyra hasn\'t slept in three days. She says the Sealing is "stable." I\'ve known her long enough to know what her stable looks like.',
        'The Order of the Sealed Sun had a garrison here once. What happened to it is classified. Ask Lyra, not me.',
        'The dungeon beneath us is older than the town. Whatever was built there was built to contain something, not to explore it.',
      ],
      quest: [
        'I want you covering the eastern approach at dusk for three nights. Tell me what you see.',
        'There\'s a target three days north. Bounty is real. So is the danger. I\'ll brief you fully if you commit.',
        'Goblin command structure has reorganized. I need eyes close enough to see the new formation.',
      ],
      order: [
        'Solara arrived before the player did. I don\'t think that\'s a coincidence. I don\'t say that about much.',
        'The Order has protocols for this situation. Solara has shown me two of them. Neither involves waiting.',
      ],
    },
    idle: [
      'Wall patrols at dawn and dusk. Do not interfere.',
      'If you\'re going beyond the walls, tell me where. It\'s not a request.',
      'Three goblins at the east ridge last night. Not a patrol — a scouting formation.',
      'You want to be useful? Go clear the path to the dungeon approach.',
      'I hold this line because someone has to. Don\'t make my job harder.',
      'Four settlements. I\'m not losing a fifth.',
    ],
  },

  'Sister Vashe': {
    greetings: {
      default: [
        'You found me. Good. I was hoping you would.',
        'I\'ve been translating. Come look at this passage — I need a second opinion.',
        'Saltmere felt smaller than I needed. This place has more room for the work.',
        'The inscription changed since yesterday. That shouldn\'t be possible. Come.',
        'Shadow-craft takes patience. You arriving is a useful interruption.',
      ],
      night: [
        'The shadows here are different from Saltmere\'s. Older. I\'m still learning them.',
        'I rarely sleep. Night is when the Veil thins and I can work properly.',
      ],
    },
    topics: {
      inscription: [
        'The Void Gate inscription is not a warning. It\'s a contract. Someone signed it. I\'m working toward the signature.',
        'Sixteen months of translation. I have seventy percent of it. The remaining thirty resists every method I know.',
        'The inscription describes something on the other side of the Gate — something that is aware of being described.',
        'There are two layers of writing. The outer layer is ancient Aethorian. The inner layer predates the founding of this realm.',
        'The inscription changes. Small things — a word here, a glyph there. I date every session of notes now. The pattern is not random.',
        'I think the inscription is a conversation. One side is the invitation. The other side is the acceptance. Both sides are still ongoing.',
      ],
      void: [
        'Veilbound craft doesn\'t oppose the Void — it negotiates with it. That distinction has kept me alive where others haven\'t.',
        'The Void is a place with rules. Most people die in it because they don\'t know the rules. I can teach you some of them.',
        'Shadow-craft is reading the boundary between presence and absence. The Void is an extreme form of that boundary.',
        'I can teach you a technique for resisting Void corruption. It requires focus and costs nothing material. Interested?',
        'The Void is not empty. That is the first thing anyone who studies it has to unlearn.',
      ],
      craft: [
        'Shadow-craft requires no material components. Only attention, geometry, and willingness to understand things that resist understanding.',
        'I can bind shadows to objects — not as decoration. As function. Ask me when you have something worth binding.',
        'The forbidden techniques aren\'t forbidden because they don\'t work. They\'re forbidden because they work well enough to frighten people.',
        'Veilbound technique is older than the Order of the Sealed Sun. They borrowed it, named it, and then tried to restrict it. Classic.',
      ],
      lore: [
        'The scholar who invited the Voidlords was named. Her name is in the inscription. I\'m not sharing it until I understand why it\'s there.',
        'Saltmere has a library containing things the Order burned everywhere else. I copied what I needed before I left.',
        'The founding of Aethoria is partially written in Void-script. That is not a coincidence. That is a message for whoever could read it.',
        'The second layer of the inscription was written by the Voidlords themselves. They knew someone would translate it eventually.',
      ],
      self: [
        'I left Saltmere because the Order there told me to stop. I don\'t stop.',
        'Three other practitioners of Veilbound craft alive in Aethoria. Two are dead now. One I don\'t speak to.',
        'I don\'t explain myself to institutions. I explain myself to evidence.',
        'The Order expelled me in everything but official record. They still haven\'t decided whether to make it official. I\'m helping them decide.',
      ],
      quest: [
        'I need someone to enter the Gate and view the inscription from the other side. I can\'t go myself — not again.',
        'There\'s a Void-touched artifact in the Ancient Vault I need for the translation. The vault is not currently unoccupied.',
        'Bring me a rubbing of the standing stone near the Corrupted Temple. I think it\'s related to the Gate inscription.',
      ],
    },
    idle: [
      'The inscription changed again. I\'ve started dating my notes.',
      'I don\'t sleep much. There\'s too much to translate.',
      'Saltmere felt safe. Safe isn\'t useful to me right now.',
      'The Veil here is thin enough that I can work without effort. That\'s either good or very bad.',
      'I have seventy percent of the inscription. The other thirty percent is what I need most.',
      'The shadows in this part of the world remember things. I\'m learning to ask the right questions.',
    ],
  },

  'Master Theron': {
    greetings: {
      default: [
        'Back. Good. I have a new contract.',
        'You\'ve grown since we last spoke. Good. I have harder work for you.',
        'Don\'t waste time on pleasantries. What can you kill?',
        'Sit down. Let me look at your progress before I decide what to give you next.',
      ],
      night: [
        'Most of my best contracts activate at night. Convenient timing.',
        'The predators hunt at night. So should you — if you want the good contracts.',
      ],
    },
    topics: {
      slayer: [
        'Slayer tasks aren\'t random. I assign what needs killing most urgently. Pay attention to the pattern.',
        'Complete the contract. Bring me proof. Don\'t bring me stories.',
        'The Void Stalker is the hardest assignment I give. I don\'t give it often. If I\'m giving it to you, read into that.',
        'Slayer Points buy access, not respect. Respect comes from the kills. Points just make that visible.',
        'Three contracts completed earns a recommendation. Ten earns an introduction. Twenty earns trust. I don\'t give trust to most.',
        'I\'ve been assigning contracts for thirty years. The world is still full of monsters. Make of that what you will.',
      ],
      threat: [
        'The Bone Giant at the Crystal Caverns is overdue for culling. Triple standard rate.',
        'Something in the Necropolis has gotten organized. Organized is more dangerous than powerful.',
        'The Dragon\'s Maw is producing more Ember Drakes than the local ecosystem supports. That\'s a problem that needs solving, not studying.',
        'The Void Stalkers are moving in groups of three now. That\'s new. That means something changed on their end.',
      ],
      self: [
        'The Void Stalker took my hand. I took its life. We both got something out of the encounter.',
        'I\'ve been a Slayer Master for thirty years. The hook is not a handicap. It\'s a reminder of what this work costs.',
        'I was going to retire. Then the Void Rift opened east of the Amber Road and retirement seemed less urgent.',
        'I don\'t take apprentices. I assign contracts. The difference is important — apprentices I\'d have to protect.',
      ],
      lore: [
        'Monster populations shift before Void events. Three days before, the intelligent ones move away from the rift zone. I\'ve tracked it for years.',
        'The undead near the Necropolis have been organized for six months. Something is directing them. It needs to die.',
        'Void Stalkers are the Voidlords\' scouts. When you see them in force, something much larger is behind them. Start running or start preparing.',
        'The Crystal Caverns weren\'t always a dungeon. Something in there changed about a century ago. The records are unhelpful.',
      ],
      quest: [
        'Current priority: Bone Giant, Crystal Caverns. Bring the core intact.',
        'The Marsh Tomb has been active for weeks. I need a count of what\'s inside before I brief anyone else.',
        'The Ancient Vault has been sealed for three centuries. Something inside recently started making noise. Go look and report back.',
      ],
      craft: [
        'The best weapon is the one you don\'t hesitate with. The material matters less than the certainty.',
        'Bring me boss trophies when you have them. I have contacts who can turn them into equipment worth carrying.',
      ],
    },
    idle: [
      'The hook is sharper than my sword. Don\'t test it.',
      'I assign contracts based on what needs killing, not what you feel like killing. Remember that.',
      'Thirty years of this work and the world is still full of monsters. Make of that what you will.',
      'Complete the contract. Bring proof. Everything else is conversation.',
      'The pattern of kills tells you more than the individual kills. Start paying attention to patterns.',
      'I\'ve killed things I can\'t describe to anyone who wasn\'t there. I sleep fine. That should tell you something.',
    ],
  },

  'Aldric': {
    greetings: {
      default: [
        'Approach. I\'m not dangerous unless you intend to be.',
        'Another visitor. The ruins aren\'t as private as they used to be.',
        'Sit. I\'ll clear the research materials. Don\'t let the bones concern you.',
        'You\'ve come to the right place if your question involves death. Most useful questions do.',
      ],
      night: [
        'Night is preferable for observation. The dead are quieter during the day, which is less useful for study.',
        'I do my best work when the living aren\'t interrupting. Yet here you are — and you look useful.',
      ],
    },
    topics: {
      undead: [
        'The dead in Aethoria are not properly at rest. I\'ve identified seventeen distinct states between alive and truly dead. Most people only recognize two.',
        'Necromancy is not evil. It is the study of the boundary between life and death. What you do with that knowledge determines your alignment.',
        'The Lich in the dungeon is not merely undead. It is a consciousness that successfully negotiated the death transition. That is scientifically remarkable.',
        'The Order expelled me for studying the wrong half of Void lore. The wrong half is the half that explains everything.',
        'Some of the dead in this region are not decaying. They are stabilizing. I have no explanation for this yet. I find it very interesting.',
        'A soul that hasn\'t moved on near the Frozen Tomb has been attempting communication for months. I can perceive the attempt. I can\'t yet parse it.',
      ],
      void: [
        'The Void and death are related but not identical. People keep conflating them. Death is a transition. The Void is a destination.',
        'Void-touched dead are categorically different from naturally dead. The Void preserves an echo — a pattern. I\'m still determining what that pattern represents.',
        'I can perceive Void contamination in dead matter. It leaves a residue. That residue is useful if you know what to do with it — and I do.',
        'The Void Pact technique isn\'t what the Order claims. It\'s a negotiated exchange, not a corruption. The difference has practical implications.',
      ],
      craft: [
        'Necromancer techniques require understanding of life-force, not the body. The body is hardware. I work with the software.',
        'Bone Armor isn\'t made of bones. It\'s made of the memory bones have of being part of a living thing. Important distinction.',
        'If you want to learn Raise Dead, I can teach you. There are prerequisites. They\'re not what you expect.',
        'Death Coil is a focussed extraction of life-force. It does not harm the soul — only the body. Some people find that more disturbing, not less.',
      ],
      lore: [
        'Three hundred years ago, the same month the Crown shattered, the death rate across the known world dropped to zero for six days. No one died. I have the records.',
        'The Necropolis was built before Hearthmoor, before the Amber Road, before the Crystal Crown. Something was buried there that preceded everything.',
        'The Void-touched dead are attempting to communicate something. Not with words. With arrangement. The pattern of their movement has syntax.',
        'The Order sealed the Necropolis a hundred and forty years ago. Whatever they sealed in there has had a hundred and forty years to think.',
      ],
      order: [
        'The Order expelled me for asking the question they didn\'t want answered. I\'ve since answered it. They were right to be afraid of the answer.',
        'The Order of the Sealed Sun seals things because sealing is easier than understanding. I prefer to understand.',
        'Three of the Order\'s senior members were necromancers before they joined. The Order doesn\'t publicize this.',
      ],
      self: [
        'Expelled for curiosity. It\'s a common story among the genuinely useful scholars.',
        'I was a model scholar until I asked the wrong question. Now I live in ruins and know more than anyone in the Order. The math works out.',
        'The ruins are quieter than the archive. And the dead here are more forthcoming than my former colleagues.',
      ],
      quest: [
        'I need samples from a Lich that\'s been stable for more than a century. The dungeon has one. Approach carefully.',
        'The undead near the Old City Sewers are organizing in a pattern I\'ve seen before. I need eyes inside.',
        'There\'s a soul near the Frozen Tomb that hasn\'t moved on. It\'s been trying to communicate. I need a translator, or something that draws it out.',
      ],
    },
    idle: [
      'The dead here are not properly dead. I find that professionally interesting.',
      'Expelled for curiosity. It\'s a common story. Mine is still being written.',
      'The bones remember. They can\'t speak, but they remember. That\'s enough, if you know how to listen.',
      'I don\'t animate the dead frivolously. Only for research. The research is very thorough.',
      'The Order would call what I do forbidden. I call it unfinished.',
      'Something in the Necropolis is old enough that I can\'t date it. That means it predates my methods.',
    ],
  },

  'High Priestess Solara': {
    greetings: {
      default: [
        'You have arrived at an important time. I\'m glad you did.',
        'The light knows you, I think. Come, let me look at you properly.',
        'Three temples fell before I found this place. I am trying to understand why this one stands.',
        'Good. Someone who can act. I have been waiting longer than I expected.',
      ],
      night: [
        'The light of the Sealed Sun reaches even here, even at night. Come — I need to show you something.',
        'Night prayer is when I feel the cracks in the Sealing most clearly. They are larger than last week.',
      ],
    },
    topics: {
      order: [
        'The Order of the Sealed Sun seals what should not be open and opens what should not be sealed. We have not always known the difference.',
        'I am the last who still holds the title. The others died or changed direction. Neither story ends well.',
        'The Order was founded thirty years after the Crown shattered. Not a coincidence — we were created to manage a problem that should have been solved.',
        'The Sealing Lyra performed was not the Order\'s technique. It was older. I need to understand where she learned it.',
        'The Order has secrets I was not told until I held the title. The secrets did not comfort me.',
      ],
      void: [
        'Divine light does not destroy the Void. It illuminates it. Illuminating something that doesn\'t want to be seen has its own particular power.',
        'The Sealed Sun is not the name of a deity. It is a description — the light was preserved against something. By whom and from what, the Order has forgotten.',
        'I can teach consecration. It is not purely a combat technique. It is a way of marking space as belonging to the living.',
        'Faith is not certainty. Faith is continuing to act without certainty. The Void counts on people confusing the two.',
      ],
      sealing: [
        'Lyra\'s Sealing is a masterwork. I don\'t know how she did it. The Order\'s version takes seven practitioners and a week of preparation.',
        'The Sealing is fraying. I can feel it in the quality of the light. The rate of decay has accelerated this month.',
        'When the Sealing breaks — and it will break — we need an alternative ready. That is why I am here.',
        'The scholar who invited the Voidlords was an Order member. We do not discuss this. I am discussing it with you because you need to know.',
      ],
      lore: [
        'The Crystal Crown and the Sealed Sun are connected. The Crown was blessed by the Order. When it shattered, the blessing scattered with the shards.',
        'The third temple fell to something that knew our defensive consecrations from the inside. Someone in the Order told it. I don\'t know who.',
        'The Sealing has a weakness that Lyra never disclosed. I found it in the old records. I\'m not sure whether to tell her that I know.',
        'The five shards each carry a fragment of consecrated light. That changes how they should be handled — and how they should be reassembled.',
      ],
      self: [
        'I arrived here one week before you. I was led here. I don\'t use that word lightly.',
        'Three temples fell on my watch. Each time I thought I could hold them. Each time I was wrong in a new way.',
        'I believe the light will prevail. I also believe belief alone is not a strategy. I need both faith and a plan.',
        'The title means I am last. Not most qualified — last. I am trying to become the former before the latter becomes critical.',
      ],
      quest: [
        'The eastern shrine has been dark for a month. Something is suppressing the consecration. I need to know what.',
        'There are four sacred sites in this region. I need each one reactivated before the Sealing fails.',
        'An acolyte who traveled ahead of me has not arrived. The road between here and the Temple of Embers is three days. I need someone to look.',
      ],
      craft: [
        'Holy water is not a metaphor. The consecration changes the physical properties of water. I can show you how it\'s made.',
        'A Paladin\'s equipment is not just equipment. It is a commitment made material. Choose what you carry carefully.',
        'The Sealed Sun\'s blessing can be applied to weapons. Not permanently — it fades with doubt. Conviction is the maintenance cost.',
      ],
    },
    idle: [
      'The light is constant. It is we who move in and out of it.',
      'Three temples. I will not lose a fourth.',
      'The Sealing is still holding. Today. Ask me again tomorrow.',
      'Faith is not certainty. Faith is continuing to act without certainty. The distinction is important.',
      'The Crown\'s shards each carry a fragment of consecrated light. That changes how you should handle them.',
      'Something is wrong with the eastern consecrations. I can feel it from here.',
    ],
  },
};

// ── World event scripted announcements ────────────────────────────────────────

const WORLD_EVENT_LINES = {
  goblin_raid:      'The eastern ridge burns with torchlight — and it is not our torches.',
  void_rift:        'A tear in the Veil opens east of the village. The air tastes of nothing.',
  plague:           'Something moves through the settlements to the south. It moves faster than news travels.',
  eclipse:          'The sun dims at midday without warning. The Sealed Sun gives no guidance for what follows.',
  blizzard:         'Cold comes from the north that has no season. Even the dead slow in this cold.',
  meteor_shower:    'Lights fall from the sky. The Void-touched ones watch them and do not look away.',
  merchant_fair:    'Traders arrive from all directions at once. Some have come from very far away.',
  undead_tide:      'The Necropolis empties. The dead have somewhere to be.',
  bandit_ambush:    'The road east is closed. Not by soldiers — by something organised.',
  void_surge:       'The crystals pulse in unison. Somewhere, a lock is straining.',
  dragon_sighting:  'A shadow crosses the sun that is not a cloud. Something vast is circling.',
  storm:            'The storm from the west brings cold even the fire cannot answer.',
};

// Generic lines for events with no specific entry
const GENERIC_EVENT_LINES = [
  'The land shifts beneath familiar paths.',
  'Something that was sleeping has woken.',
  'The Void stirs where it was once quiet.',
  'Hearthmoor holds. For now.',
];

// ── Used-line tracker (avoid repeating within a session) ─────────────────────

const _usedLines = new Map();   // npcName → Set<string>

function _getUsed(npcName) {
  if (!_usedLines.has(npcName)) _usedLines.set(npcName, new Set());
  return _usedLines.get(npcName);
}

function _pickUnused(lines, npcName) {
  if (!lines || lines.length === 0) return null;
  const used = _getUsed(npcName);
  const fresh = lines.filter(l => !used.has(l));
  const pool  = fresh.length > 0 ? fresh : lines; // cycle when exhausted
  const choice = pool[Math.floor(Math.random() * pool.length)];
  if (fresh.length > 0) used.add(choice);
  if (used.size > lines.length * 0.8) {
    // Reset when most lines have been seen
    used.clear();
  }
  return choice;
}

// ── Topic matcher ─────────────────────────────────────────────────────────────

function _matchTopic(input) {
  if (!input) return null;
  const lower = input.toLowerCase();
  for (const [topic, keywords] of Object.entries(TOPIC_KEYS)) {
    if (keywords.some(kw => lower.includes(kw))) return topic;
  }
  return null;
}

// ── Context selector ──────────────────────────────────────────────────────────
// Returns greeting lines appropriate to current context (for use in both
// chat() greeting routing and the generateGreeting() method).

function _getContextGreetLines(npcPool, worldCtx) {
  const g = npcPool?.greetings;
  if (!g) return null;
  if (worldCtx?.time && (worldCtx.time.toLowerCase().includes('night') || worldCtx.time.toLowerCase().includes('midnight'))) {
    if (g.night?.length) return g.night;
  }
  if ((worldCtx?.act ?? 0) >= 3 && g.act_high?.length) return g.act_high;
  return g.default ?? null;
}

function _selectGreeting(npcName, worldCtx) {
  const pool = DIALOGUE[npcName];
  if (!pool) return null;
  const lines = _getContextGreetLines(pool, worldCtx);
  if (!lines?.length) return null;
  return _pickUnused(lines, npcName + '_greet');
}

// ── AethoriaAI (fully scripted) ───────────────────────────────────────────────

export class AethoriaAI {

  /**
   * Main NPC dialogue method.
   * Signature identical to the former AI version — callers unchanged.
   *
   * @param {string}   _systemPrompt  Ignored (kept for API compat)
   * @param {Array}    history        [{role,content}] conversation history
   * @param {string}   npcName        NPC name
   * @param {object}   worldCtx       { time, weather, worldEvent, act, factionStanding, … }
   * @returns {Promise<string>}
   */
  static async chat(_systemPrompt, history, npcName = null, worldCtx = null) {
    const npcPool = npcName ? DIALOGUE[npcName] : null;

    // Derive player input from last history entry
    const lastEntry = history?.at(-1);
    const playerInput = (lastEntry?.role === 'user') ? lastEntry.content : '';

    // Try to match a topic from player input
    const topic = _matchTopic(playerInput);

    if (npcPool && topic) {
      // Greeting topic → use the greetings.default pool for a contextual opener
      if (topic === 'greeting') {
        const greetLines = _getContextGreetLines(npcPool, worldCtx);
        if (greetLines?.length) {
          const line = _pickUnused(greetLines, npcName + '_greet');
          if (line) return line;
        }
      }

      const topicLines = npcPool.topics?.[topic];
      if (topicLines?.length) {
        const line = _pickUnused(topicLines, npcName + '_' + topic);
        if (line) return line;
      }
    }

    // Try idle pool
    if (npcPool?.idle?.length) {
      const line = _pickUnused(npcPool.idle, npcName + '_idle');
      if (line) return line;
    }

    // Final fallback
    return this._genericFallback();
  }

  /**
   * Generate a greeting when player enters NPC range.
   * Returns null to signal "use default greeting" (same contract as before).
   *
   * @param {string} npcName
   * @param {object} _playerState   Ignored (kept for API compat)
   * @param {object} worldCtx
   * @returns {Promise<string|null>}
   */
  static async generateGreeting(npcName, _playerState, worldCtx = null) {
    const line = _selectGreeting(npcName, worldCtx);
    return line ?? null;
  }

  /**
   * Return a scripted world-event announcement.
   * @param {object} event  { id, name, desc }
   * @returns {Promise<string>}
   */
  static async announceWorldEvent(event) {
    const id   = event?.id ?? '';
    const line = WORLD_EVENT_LINES[id];
    if (line) return line;
    // Try matching by name keywords
    const name = (event?.name ?? '').toLowerCase();
    for (const [key, text] of Object.entries(WORLD_EVENT_LINES)) {
      if (name.includes(key.replace('_', ' '))) return text;
    }
    return GENERIC_EVENT_LINES[Math.floor(Math.random() * GENERIC_EVENT_LINES.length)];
  }

  /**
   * Quest flavor text (scripted — returns existing description enhanced with context).
   * Kept for API compat with QuestSystem.
   * @param {object} questBase  { type, title, desc, target, needed, giver }
   * @param {object} worldCtx
   * @returns {Promise<string>}
   */
  static async generateQuestFlavor(questBase, _worldCtx = null) {
    // The scripted StorySystem quests already have good flavor text.
    // Just return the existing description — no AI enhancement needed.
    return questBase.desc ?? '';
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  static _genericFallback() {
    const lines = [
      'The shadows grow long in Aethoria.',
      'The Voidlords stir again near the eastern ruins.',
      'There is power in the old stones on the hilltops.',
      'Many brave souls entered that dungeon. Few returned.',
      'The world does not wait for preparation. Move.',
      'Hearthmoor holds because of what Lyra did. Ask her about it.',
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }
}
