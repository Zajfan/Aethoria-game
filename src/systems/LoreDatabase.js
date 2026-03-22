// All written lore for Aethoria — scrolls, codex entries, sign text, item descriptions
// Organised by category so the UI can build a Codex panel from it

export const LORE = {

  // ── World history ──────────────────────────────────────────────
  history: [
    {
      id: 'age_of_crowns',
      title: 'The Age of Crowns',
      text: `Long before Hearthmoor drew its first breath, seven kingdoms shared the land of Aethoria under one sky and one law — the Crystal Crown. Forged by the First Weavers from the bones of a fallen star, the Crown did not rule men. It ruled the leylines, the rivers of invisible power that flow beneath all living things. Whoever wore the Crown could feel every heartbeat in the realm. They said the old kings wept constantly — not from sorrow, but because they felt everything.`,
    },
    {
      id: 'voidlord_rising',
      title: 'The Coming of the Voidlords',
      text: `They did not invade. They were invited. Three hundred years ago, a circle of scholars in the kingdom of Verath grew obsessed with what lay beyond the leylines — the spaces between power, the silence beneath all sound. They called it the Deep Void. They built a gate to speak with it. It spoke back. The Voidlords stepped through not as conquerors but as guests, and they have never left. The gate was never closed. No one who built it survived long enough to close it.`,
    },
    {
      id: 'crown_shattering',
      title: 'The Shattering',
      text: `The Crystal Crown shattered on the third night of the Voidlord siege. Five shards flew to the four corners and one deep underground. Without the Crown, the leylines went dark. Crops failed. Children were born silent. The seven kingdoms fell one by one — not to war but to forgetting. People simply stopped remembering why they had built things. Hearthmoor survived because Elder Lyra sealed it with something she has never fully explained.`,
    },
    {
      id: 'hearthmoor_founding',
      title: 'Hearthmoor — the Last Village',
      text: `Hearthmoor was not always the last. Once it was merely one of forty villages along the Amber Road. The others are gone now. Some burned, some sank, some simply emptied of people without explanation. Elder Lyra was young when she performed the Sealing — a binding that anchors Hearthmoor to the leyline beneath the old well at the village center. As long as someone draws water from that well each day, the village endures. She has never told anyone what she paid for the binding.`,
    },
    {
      id: 'lyra_secret',
      title: 'What Lyra Knows',
      text: `The oldest scroll in Lyra's study — the one she keeps face-down and weighted with a stone — reads as follows: "The pact was made willingly. The scholar who opened the gate was not of Verath. She was of Hearthmoor. She believed the Voidlords would teach, not consume. She was wrong about everything except one thing: they will leave if all five shards are returned. She paid them with a promise. The promise has not yet been collected." The scroll bears no signature. The handwriting is Lyra's own.`,
    },
  ],

  // ── Shard lore ─────────────────────────────────────────────────
  shards: [
    {
      id: 'shard_1',
      name: 'Shard of Dawning',
      location: 'Hearthmoor Ruins — below the old temple',
      lore: `The first shard landed closest to the source. It sank into the ruins of the old Hearthmoor temple on the night of the Shattering and has been warm to the touch ever since. Travellers who slept near it reported dreaming in languages they had never learned.`,
    },
    {
      id: 'shard_2',
      name: 'Shard of Roots',
      location: 'The Deep Forest — inside the Elderwood shrine',
      lore: `Trees grow strangely near this shard — in perfect concentric rings, always facing it. The Elderwood creatures do not attack those carrying fresh herbs. Coincidence, say some. The shard is humming, say those who have held it.`,
    },
    {
      id: 'shard_3',
      name: 'Shard of Shadow',
      location: 'Dungeon depths — the Void Gate chamber',
      lore: `This shard fell through the Void Gate before it sealed partially. It exists in two places at once — physically in the dungeon, but its reflection is visible in the Deep Void. The Void Knight was placed here to guard it. By whom is not recorded.`,
    },
    {
      id: 'shard_4',
      name: 'Shard of Storm',
      location: 'Eastern cliffs — the lightning-struck spire',
      lore: `When storms come to Aethoria, they spiral around this point. Fishermen use it to navigate. The shard has not moved since the Shattering, though the cliff face around it has eroded to nothing. It floats three inches above where stone used to be.`,
    },
    {
      id: 'shard_5',
      name: 'Shard of Ending',
      location: 'The Deep Void entrance — Lyra knows the way',
      lore: `No one who has searched for the fifth shard has returned to describe finding it. Those who came back empty-handed reported only this: that near the end of their search, they stopped wanting to find it. The desire simply left them, like warmth leaving a body.`,
    },
  ],

  // ── NPC backstories ────────────────────────────────────────────
  npcs: {
    'Elder Lyra': {
      backstory: `Lyra was twenty-three when she opened the gate. She tells people she was fifty. She has not aged since the Sealing, which she explains as a side effect. It is not a side effect. She has watched everyone she has ever loved die while she remained. She is not cruel. She is exhausted beyond what language can express, and she keeps going anyway.`,
      secret: `She made the pact. She is the scholar from the scroll. She opened the Void Gate. She has been trying to undo it for three hundred years. The player is not the hero of the story — they are the key she has been waiting for. She will tell them this when she decides they are ready. She may tell them too late.`,
    },
    'Gareth': {
      backstory: `Gareth was a soldier before he was a smith. He lost his left eye and his sword arm in the Battle of the Ember Road — then taught himself to forge left-handed rather than stop fighting. He is gruff because he has buried thirty friends and has decided caring is a luxury he cannot afford. He is wrong. He knows he is wrong.`,
      secret: `The Iron Crown on his forge wall is not decorative. It is a replica of the Crystal Crown he spent twenty years building from memory, based on a description in a stolen Voidlord codex. It does not work. He keeps trying to make it work.`,
    },
    'Mira': {
      backstory: `Mira remembers the names of every plant she has ever encountered. She remembers the names of every person who ever came to her for healing. She does not remember the name of the village she was born in — the Forgetting took it before she was old enough to write it down. She collects names the way others collect gold.`,
      secret: `She has found a herb that grows only near Voidlord traces — she calls it Nullwort. Brewed correctly, it does not heal. It unmakes. She has not told anyone because she does not yet know what it can unmake, and she is afraid to find out.`,
    },
    'Dorin': {
      backstory: `Dorin has visited forty-three settlements across Aethoria. Thirty-nine of them no longer exist. He started counting after the twelfth one vanished while he was en route back to trade. He carries maps of where they were. He updates them. He does not know why he keeps updating maps of places that are gone.`,
      secret: `He has seen the Void Gate. He has been inside it. He came back. He will not say how, but he left something behind, and sometimes at night he reaches for it — a habit, like reaching for a sword that has been sheathed so long you forget it is gone.`,
    },
    'Capt. Vel': {
      backstory: `Vel has held the line at Hearthmoor for eleven years. Before that she held the line at four other places, each of which eventually fell. She is not pessimistic. She is precise. She knows Hearthmoor will eventually fall too, and she intends for it to take as long as possible, because long enough might become forever.`,
      secret: `She has a standing order she has never spoken aloud: if the shards are ever gathered and the Crown is restored, she is to kill the person who restores it before they put it on. She received this order from Lyra. She agreed, and then spent three years trying to understand why. She still does not fully understand. She will follow it anyway.`,
    },
  },

  // ── Random world scrolls (found in chests and ruins) ──────────
  scrolls: [
    { id:'s01', title:'A soldier\'s last entry', text:`Day 44. The Void Knight has not moved in six days. We thought it was dead. On day 43 it killed three of us without leaving its position. I am writing this in case someone finds it after. The thing is not guarding the shard. The shard is feeding it. Stop trying to take the shard. Find another way.` },
    { id:'s02', title:'Herbalist notes — field edition', text:`The grey-leafed plant near the eastern ruins is not poisonous but it tastes like grief — that is the only word for it. One of my apprentices ate three leaves on a dare. He was not harmed but he cried for four hours and could not explain what he was sad about. I have labelled the jar accordingly.` },
    { id:'s03', title:'Fragment — untitled poem', text:`They do not hate us. That would be easier.\nThey find us interesting the way we find insects interesting.\nWe build things. We tear them down.\nWe love each other for thirty years and then go cold.\nThe Voidlords have been watching for three hundred years\nand they are still not bored of us.\nI am not sure if this is comforting or the most frightening thing I know.` },
    { id:'s04', title:'Blacksmith\'s technical notes', text:`Iron taken from within one mile of a Void trace is unusable — it crystallises wrong and shatters at half the expected stress. However, iron that has been exposed to Void trace and then re-forged at white heat produces a metal I have no name for. Harder than anything I have worked. Takes an edge that does not dull. I have made three pieces. Two of them I keep. One I will not look at.` },
    { id:'s05', title:'A child\'s drawing, annotated', text:`[A drawing in charcoal of a large figure with too many angles, surrounded by smaller figures. At the bottom, in careful child-lettering: "This is the big one. Mama says do not draw it. I am drawing it so it knows I am not scared." The annotation, in different handwriting, reads: "It knows."]` },
    { id:'s06', title:'Trade ledger — final page', text:`Sold: 3 bolts undyed cloth, 1 sack oats, iron nails (bulk), 2 cartloads timber. Bought: nothing. The buyer did not come. The road to Millhaven is gone. Not blocked. Gone. The ground where it was is flat and undisturbed as if the road was never there. I have checked my maps three times. I built that road. I am going home.` },
    { id:'s07', title:'Lyra\'s margin notes on a map', text:`[In cramped handwriting along the border of an old map] The leylines still flow here, here, and probably here. The Void does not consume the leylines — it redirects them. Everything the Crown did, the Void is doing in reverse. When the last shard returns, the current will reverse again. What this does to anything drawing power from the redirected lines is not recorded anywhere I have found. I have been looking for sixty years.` },
    { id:'s08', title:'Guard patrol log, Hearthmoor gate', text:`Hour 6: Nothing. Hour 7: Nothing. Hour 8: A wolf, kept distance. Hour 9: The wolf was not a wolf. Reported to Captain Vel. Captain Vel said: "Yes. Don\'t engage. If it circles three times, ring the bell." It did not circle. It sat and watched until dawn and left. Captain Vel did not seem surprised. I asked her what it was. She said: "Someone we know. Someone who left."` },
    { id:'s09', title:'Research notes — the Sealing', text:`A binding of this type has three components: an anchor (the well), a constant action (the daily drawing of water), and a cost. The anchor is visible. The constant action is observable. I have searched for the cost for forty years. It is not in any record Lyra has shared. My best hypothesis: the cost was not paid once. It is being paid continuously. Whatever Lyra gave, she is still giving it. Whatever it is, she has an infinite amount of it, or she has been paying since before she should have run out. I cannot decide which possibility disturbs me more.` },
    { id:'s10', title:'Letter, unsent', text:`I know you will not read this. I know you have not been able to read anything for a long time. I keep writing anyway. The village is still here. The kid you liked from the market stall has grandchildren now. Three generations. You would have liked them. They have your eyes somehow — not the colour, but the way they look at things, like they are already thinking about what comes next. I drew water from the well today. I will draw it tomorrow. The village is still here.` },
  ],

  // ── Enemy lore codex ──────────────────────────────────────────
  bestiary: {
    GOBLIN:   { title:'Goblins', text:`Not born — made. Void energy crystallising around ambient fear and hunger produces these. They are not intelligent but they are persistent and they learn from what fails to kill them. A goblin that survives three encounters with a warrior will never charge directly again.` },
    WOLF:     { title:'Void Wolves', text:`Once ordinary wolves. Prolonged exposure to Void trace rewrites something in the bone. They do not go rabid — they go cold. Methodical. They have been observed retreating to report back before attacking. What they report back to and how is unknown.` },
    SKELETON: { title:'The Persistent', text:`The Void does not reanimate the dead. It preserves the last intention. A man who died defending something will stand and defend it indefinitely, without flesh, without hunger, without knowing what he was defending is long gone. There is no way to tell them it is over.` },
    TROLL:    { title:'Rift Trolls', text:`Trolls come through the fractured places where the leylines bent under Void pressure. They are not from Aethoria. They are confused, which makes them dangerous. Creatures this large are rarely confused — they are usually the thing other things are confused by.` },
    VOID_KNIGHT: { title:'The Void Knight', text:`A warrior who entered the Void Gate willingly, looking for power. Found it. The power found him in return. He has guarded the third shard for two hundred years. He does not remember why. He only remembers that he must. On his third defeat, if someone is present who speaks to him, he will say one word before the Void reclaims him. The word is a name. It is Lyra\'s name.` },
    STONE_COLOSSUS: { title:'The Stone Colossus', text:`Built by the First Weavers as a guardian for the Crown itself. When the Crown shattered, it received no further instructions and defaulted to: protect everything. It does not distinguish between threats and travellers. It has been failing at its purpose for three hundred years and it cannot stop trying.` },
  },
};

// Helper to get a random scroll for chest loot
export function randomScroll() {
  const s = LORE.scrolls;
  return s[Math.floor(Math.random() * s.length)];
}

// Get codex entry for an enemy type
export function beastiaryEntry(enemyKey) {
  return LORE.bestiary[enemyKey] || null;
}
