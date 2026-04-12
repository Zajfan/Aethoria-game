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

    // ── New scrolls — history ────────────────────────────────────────────────
    { id:'s11', title:'The First Weavers — a summary', text:`The First Weavers did not build with stone. They built with pattern — leyline signatures shaped into persistent structures. The Crystal Crown was their last and greatest work, requiring seventeen years and the willing deaths of nine of them. When asked why they sacrificed themselves for it, the leader wrote: "The Crown will outlast us anyway. We are just choosing how to be useful." They were right. It outlasted them by three thousand years.` },
    { id:'s12', title:'On the nature of the Forgetting', text:`The Forgetting is not memory loss. Memory loss is random, patchy, and distressing. The Forgetting is precise and painless. It erases specific categories: names of places, purposes of objects, reasons for things. A smith who Forgets will still know how to forge. He will not know why he builds what he builds or who it is for. He will keep building anyway, which is either comforting or terrible depending on how you look at it. The Sealing protects Hearthmoor from the Forgetting, which is why everyone else still has maps while the rest of Aethoria has forgotten what roads are for.` },
    { id:'s13', title:'The Voidlords: field observations', text:`They do not have bodies in any meaningful sense. The shapes they present are for our benefit — approximations of what a powerful thing should look like. The Void Knight is not a Voidlord. He is a human who was reshaped into something they find useful. The actual Voidlords are larger than the dungeon they occupy. We have been fighting their furniture.` },
    { id:'s14', title:'Dwarven inscription — Ashveil deep vault', text:`[Translation by Vashe, partial] "We saw the star fall. We measured its trajectory. We determined the impact date two hundred and three years in advance. We built accordingly. When the ground shook and the sky turned and the Crown broke, we looked at our preparations and decided they were insufficient. We are still building. Anyone who finds this: the lower vault is still sealed for a reason. Do not be clever."` },
    { id:'s15', title:'Sailor\'s log — the Crystal Coast', text:`The sea here is wrong. Not dangerous wrong — thoughtful wrong. The water reflects things that are not above it. Yesterday I saw the old lighthouse in the reflection, standing as it did before it fell. The helmsman says: sail past quickly and don't look. I asked why. He said: "Because eventually it starts showing you the future, and you will change what you do, and then it will change what it shows, and you will change again." I did not look.` },
    { id:'s16', title:'Lyra\'s laboratory notes, ca. 50 years post-Shattering', text:`Hypothesis: the pact can be undone if the thing promised is delivered by means of delivery I did not specify. The Voidlords said "a successor who bears the Crown forever." They did not specify: forever measured in Void-time or mortal time. They did not specify: a willing successor, or one coerced. They did not specify: bearer of the original Crown, or bearer of the restored one. I have spent forty years finding every ambiguity in a twenty-word sentence. I am not done.` },
    { id:'s17', title:'On the subject of minions', text:`A Necromancer's raised dead are not conscious. This is the important part. They are persistent muscle-memory, not imprisoned souls. The soul is already gone. What remains is the body's last instructions, on repeat. A soldier raised from the dead will fight, never tire, and never surrender, not because he wishes to but because he left his body mid-fight and it did not get the message to stop. This distinction matters. Or it doesn't. Depending on how you feel about soldiers.` },
    { id:'s18', title:'The Order of the Sealed Sun — founding charter', text:`We are formed to maintain what was made. Not to expand, not to conquer, not to convert. Three things: find the seals, hold the seals, repair the seals. Our members are not soldiers — they are maintenance workers for a machine too large to see all of. The machine is Aethoria. The machine is breaking. We have seventeen people and fourteen functioning seals. We were four hundred people and ninety seals ten years ago. We will do what we can.` },
    { id:'s19', title:'Merchant\'s private journal, year of the Tide', text:`I have calculated it. If I take the long road through the Marshes and avoid Ashveil entirely, I can still make the northern circuit in thirty days. Thirty days is worth it because the thirty-first settlement on my route was Elderstone, and Elderstone is gone. I checked. It is not burned, not flooded. The market square has fresh flowers in it — someone put them there this spring. I don't know who. I don't know why. I am rerouting.` },
    { id:'s20', title:'On the Crystal Wastes', text:`The Crystal Wastes are not natural terrain. The crystals that cover the ground, walls, and sky in the northern reaches are solidified leyline energy. After the Crown shattered, the leylines in the north tried to compensate and overloaded. The waste is what happens when pure power has nowhere to go. It is beautiful and it will cut you apart. The creatures that live there have adapted. We have not. Don't go north without purpose.` },

    // ── New scrolls — new enemies/dungeons ──────────────────────────────────
    { id:'s21', title:'Slayer field report: Void Stalkers', text:`They are invisible when stationary. Movement causes a ripple in ambient light — learnable if you know what to look for. The trick: they always approach from uphill. Always. We do not know why. Take the high ground and wait. They will come to you. Whether you want them to is a separate question.` },
    { id:'s22', title:'The Necropolis — survey notes', text:`The city beneath the eastern plateau is older than the kingdoms. It predates the Crystal Crown. The Bone Giants that walk it are not raised dead — they are original inhabitants, changed over centuries by exposure to the leylines beneath them. They recognize the Crown. If you are wearing it or carrying a shard, they stop what they are doing and stare. This is not comforting. Move faster.` },
    { id:'s23', title:'Ice Tomb inscription', text:`[Carved in a language that post-dates the Crown but pre-dates the Shattering] "This place is cold because she asked it to be. She said: preserve me until the right one comes. We asked who the right one would be. She said: they will know. We sealed the entrance. We waited. We are still waiting. Hello, right one."` },
    { id:'s24', title:'Soul Reavers — observed behaviour', text:`They do not drain health. They drain intent. A man who loses enough intent to a Soul Reaver does not die — he simply stops having reasons to continue. He sits down. He does not get back up unless given an external reason that penetrates whatever the Reaver left behind. The effect is reversible with Nullwort tea, which Mira has declined to make in bulk. She will not explain why.` },
    { id:'s25', title:'The Dragon\'s Maw — warning marker', text:`[Stone marker, badly weathered] DO NOT. [Rest illegible.] [Smaller text, fresher, carved beneath the original] Someone came back. He is fine. He does not talk about it but he is fine. I asked him what was in there. He said: "Big. Old. Angry in a way that makes angry seem like the wrong word." He bought a very large axe. He went back. — Dorin` },
    { id:'s26', title:'On Ember Drakes', text:`The volcanic drakes differ from the coastal variety in one critical way: coastal drakes burn from outside, volcanic drakes burn from the inside. The fire does not come from their mouths in the conventional sense. It comes from whatever passes for their soul. You cannot put it out. You can only outlast it. Fortunately, they tire before they die. Kill them before they rest.` },
    { id:'s27', title:'The Void Citadel — approach notes', text:`The structure does not exist in one location. It exists at the intersection of three reality failures — places where the Void and Aethoria overlap. Approaching from the east means entering from Aethoria. Approaching from the west means entering from something else. Do not approach from the west. The Empress built it this way deliberately. She wants visitors, not intruders. Visitors use the east entrance.` },
    { id:'s28', title:'Bone Tyrant legend, oral tradition', text:`The king of Verath did not die in the Shattering. He was absorbed. The Void does not consume kings the same way it consumes farmers — too much concentrated purpose, too much intention. Instead of erasing him, the Void built around him. He has been expanding outward ever since, incorporating everything he touches. The Necropolis is what three hundred years of expansion looks like. The Bone Tyrant is the original center of it.` },
    { id:'s29', title:'Research note — the Amalgam', text:`If multiple Voidlords lose enough of themselves to the world they are occupying, residue accumulates. It is not intentional. It is thermodynamic. The residue of every Voidlord who ever lost a piece of itself in Aethoria will eventually coalesce. The question is not whether this happens. The question is whether the resulting entity retains the original consciousness or is simply mass. After twenty years of research, I lean toward mass. I am hoping to be right. — Sister Vashe` },
    { id:'s30', title:'Corrupted Paladin field notes', text:`The first thing the Void does to a Paladin is remove the doubt. Not the faith — the doubt. Faith without doubt is not belief. It is compulsion. A Paladin who never questions the mission will complete it regardless of what the mission becomes. That is the corruption. Everything after is just the expression of it. The only cure we have found is to kill them, which seems to miss the point.` },

    // ── New scrolls — NPC secrets ────────────────────────────────────────────
    { id:'s31', title:'From Vashe\'s private notes', text:`The Void Gate inscription took me four years. The first three I spent on the language. The fourth I spent deciding whether to translate it or burn it. The translation says: "We will return when the promise is fulfilled. The promise: deliver to us a sovereign of Aethoria, willing, bearing the Crown. We will accept no substitute." I have not told anyone. I need to know who made the promise first.` },
    { id:'s32', title:'Theron\'s mission log', text:`Task 847: Void Stalker cluster, east road. Completed. Casualties: none, which is unusual. Task 848: Bone Giant patrol, Necropolis edge. Completed. Casualties: three fingers, right hand. Still sufficient. Task 849: Recruit assessment. The new one has potential. Gave them the easy list first. If they come back from the Void Elemental assignment with both hands and the right attitude, I will give them the real work.` },
    { id:'s33', title:'Aldric\'s field journal', text:`The undead in the Necropolis are not raised by a Necromancer. They were never raised — they were never fully dead. The leylines beneath the old city have been sustaining cellular activity for three centuries in these bodies. Not consciousness — just function. They walk because walking was the last thing they were doing. This distinction has theological implications I am not equipped to handle. I have written to the Order. They have not responded.` },
    { id:'s34', title:'Solara\'s prayer records', text:`Day 1,204 since the last temple fell. I record this not because anyone will read it but because recording it is the practice. The practice is the temple. I carry it with me. I seal what I can find to seal. I bless what I can find to bless. I do not know if it works. I know that stopping would not work either. The Order was four hundred people. I am one. The seals still hold because someone holds them. That is enough. It must be enough.` },
    { id:'s35', title:'Dorin\'s inventory record, final entry', text:`Stock: everything. No buyers. The fortieth settlement is gone. I counted wrong — I have been back three times and the road remains but the village at the end of it does not. I am standing where the market was. The stalls have produce in them, still fresh. Nobody put it here this morning. Nobody put it here because there is no this morning here. There is just the produce, and the empty stalls, and the strange complete silence of a place that has been Forgotten but has not been told yet.` },

    // ── New scrolls — world events and lore ─────────────────────────────────
    { id:'s36', title:'On Void Rifts', text:`A Void Rift is not a gate. It is a seam. Where the Void and Aethoria have been pressed against each other for too long, the boundary develops weaknesses. A Rift does not bring Voidlords through — they are already through. A Rift brings through the smaller things: the ambient creatures, the scraps of void-matter, the intentions that did not make it into full creatures. It is a tear in a curtain, not a door.` },
    { id:'s37', title:'Crystal Storm warning — observatory log', text:`When the leylines overload, excess energy disperses as crystallised fragments. These travel fast, have no trajectory logic, and will shatter on contact with anything dense. The crystals are not dangerous individually. The danger is that a Crystal Storm signals massive leyline disruption somewhere on the continent. Something has consumed, redirected, or destroyed a major leyline node. Three storms in thirty years. We have not found the cause of the third.` },
    { id:'s38', title:'The Merchant\'s Fair — historical record', text:`Before the Shattering, the Merchant's Fair ran for seven days every spring in the city of Varos. The Fair had its own laws: no violence, no theft, and — uniquely — no lies. Traders who lied at the Fair were expelled and stripped of their merchant status. It sounds unenforceable. It was enforced. Varos had a Weave-bound truth-stone at its centre. The stone still exists. It is in the Void Citadel. The Empress uses it as a doorstop.` },
    { id:'s39', title:'On the day/night cycle and the Void', text:`The Void is stronger at night. This is not mysticism — it is measurement. The leylines that sustain the Sealing draw power from sunlight, however indirect. During the hours of darkness, the Sealing weakens by approximately twelve percent. Lyra compensates by drawing water from the well at midnight in addition to dawn. Nobody else knows this. She does it alone, in the dark, every night, quietly.` },
    { id:'s40', title:'The Crown — structural analysis', text:`The Crystal Crown does not emit power. It regulates it. The leylines of Aethoria were not created by the Crown — they predate it. Without the Crown, the leylines function like a river system after a dam breaks: chaotic, destructive, unsustainable. With the Crown, they flow in predictable, maintainable patterns. The Voidlords did not want the Crown because it was powerful. They wanted it because without it, Aethoria slowly tears itself apart, which makes it easier to consume.` },

    // ── New scrolls — gathering and crafting ─────────────────────────────────
    { id:'s41', title:'Miner\'s guide to void-adjacent ore', text:`Standard ore behaves normally up to ten meters from a Void trace. Beyond that, crystallisation patterns shift. The resulting metal is dense, harder, and exceptionally difficult to smelt without coal and extreme heat. The dwarves called it Mithril — which in their language means "what remains when everything else leaves." The name is accurate. It is what survives when normal metal fails.` },
    { id:'s42', title:'Woodcutter\'s field notes — Corrupted Forest', text:`The trees near Void traces do not burn. I tried — six different fire sources. They shed the flame like water. The wood from these trees is Ancient Wood, which trades well but is difficult to work without void-attuned tools. The sap is luminescent in darkness. Several Void creatures avoid it. I have not tested why. Testing why is not my job. Cutting and carrying is my job.` },
    { id:'s43', title:'Fisher\'s notes — the deep pools', text:`The pools near Void traces have fish in them that should not exist. They are edible — I have checked and double-checked. They taste unusual: the flavour changes based on what you were thinking about when you cooked them. My apprentice cooked one while thinking about his mother. He said it tasted like her bread. I cooked one while thinking about the ocean. It tasted like salt and distance.` },
    { id:'s44', title:'Herbalism treatise — practical notes', text:`A full catalogue of Aethoria's medicinal plants would take a decade to compile. For field purposes: green herbs heal, grey herbs investigate, red herbs treat, black herbs reverse. Nullwort is grey with black edges, which means it both investigates and reverses. Investigates what? Reverses what? That is the question. Mira says she knows the answer but is not sharing until she is certain it will not make things worse. That was eighteen months ago.` },
    { id:'s45', title:'Slayer Master\'s apprentice notes', text:`Master Theron says: there is no monster that cannot be killed with sufficient preparation, information, and patience. Then he says: the monsters that cannot be killed with those things are not monsters. I asked him what they are instead. He looked at his missing fingers for a moment and said: "Problems of a different kind." He did not elaborate. I am learning that this means I should not ask follow-up questions.` },

    // ── New scrolls — post-Crown world ──────────────────────────────────────
    { id:'s46', title:'The day after the Crown was restored — log entry', text:`It happened at dusk. The sky changed colour — not dramatically, just slightly more itself than it had been. Vel noticed first. She said: "The fog on the east road is gone." Not thinned. Gone. The road is visible for the first time in eleven years. We stood there looking at it for a long time. Nobody wanted to be the first to walk it. Eventually Dorin said he had a delivery to make and set off. We watched until he was out of sight. He did not come back the same. He came back better. That is not nothing.` },
    { id:'s47', title:'On what the Crown restoration did not fix', text:`The dead are still dead. The lost settlements are still lost. The Forgetting took what it took and the Crown's return did not give any of it back. The leylines flow cleanly now but the damage they flowed through for three centuries remains. Aethoria is not healed. It is stable. Stability is the precondition for healing. It is not the same thing. Anyone who tells you the restoration fixed it is not wrong about what happened. They are wrong about what happens next.` },
    { id:'s48', title:'The Amalgam — eyewitness account', text:`I saw it rise from the well. It was larger than I expected and quieter than I expected — things that large usually make noise just by existing, displacing air and earth. This one was silent. It moved like it had always been there and was only now admitting it. I was behind the village wall. I had a crossbow, which was funny in hindsight. It turned and looked at me, specifically, and I had the absolute certain knowledge that it had been watching me my entire life. Then someone hit it from the other side of the square and it turned away. — Capt. Vel` },
    { id:'s49', title:'Vashe\'s translation — Voidlord promise, full text', text:`"We ask one thing in return for our passage. When the Crown is whole again, the one who bears it must step into the Deep Void for three days and three nights and return. If they return, the debt is paid and the gate is sealed forever. If they do not return, the gate remains open and the debt is transferred to whoever closes it after them." Lyra found the loophole in 1997, 247 years after she made the pact. The loophole: entering and leaving the Void with the Crown counts as bearing it. The passage is three seconds, not three days. She was waiting for someone fast enough.` },
    { id:'s50', title:'What Lyra said at the end', text:`She said: I am tired. She said it the way people say it when they mean something that does not have a word. Not tired like sleep-tired. Tired like three-hundred-years tired. Tired like I-have-been-holding-this-and-I-would-like-to-put-it-down tired. She said: I am tired. And then, like she had been practicing, which she had, probably for years: thank you. And then she was still. Not gone — still. The difference matters. She was not gone. She was finally still. The well needed water drawn. Someone drew it. That is the story.` },
  ],

  // ── New NPC backstories ────────────────────────────────────────
  // (extends npcs object above — included here for expansion without breaking existing data)
  npcs_extended: {
    'Sister Vashe': {
      backstory: `Vashe spent four years in Saltmere translating the Void Gate inscription and three more deciding what to do with what she learned. She left the Veilbound order when she realised they were building toward a solution without fully understanding the problem. She came to Hearthmoor because Elder Lyra is the only person who knows more than she does, and because the inscription mentioned this specific well by name, three hundred years before it was built.`,
      secret: `She knows the full text of the Voidlord promise. She has not told Lyra because she does not know if Lyra already knows. She has not told anyone else because she has identified the loophole and does not want anyone taking it before the right person is ready. She is evaluating the player every time she gives them a quest.`,
    },
    'Master Theron': {
      backstory: `Theron was the third best Slayer in Aethoria before the Shattering. The first two are dead. He does not count this as an achievement. He counts the 847 completed assignments in his log, the seventeen monster types he has personally catalogued, and the eleven apprentices he has trained who are still alive. He does not count the ones who are not.`,
      secret: `He knows where the Void Citadel is and has known for twelve years. He has not gone in because he is not strong enough alone and has not found anyone he trusts to go with him. He watches every adventurer who comes through Hearthmoor. He is watching the player.`,
    },
    'Aldric': {
      backstory: `Expelled from the Order of the Sealed Sun at thirty-two for studying the wrong half of Void lore. He did not argue. He said: "Someone has to." He has lived alone in the ruins for eight years, eating poorly and writing extensively. His notes on the undead are the most accurate in Aethoria. The Order has sent four people to retrieve them. He gave all four copies and sent them back. He keeps the originals.`,
      secret: `He is not just studying the undead. He is looking for his sister, who died in the Necropolis three years ago and whose body was not recovered. He believes she is still there in some form. He does not know if he is right. He does not know if being right would be better or worse.`,
    },
    'High Priestess Solara': {
      backstory: `The last surviving Sealed Sun high priest. She has performed over two hundred sealing rituals, watched fourteen fail, and rebuilt eleven from the foundations up. She is rigidly, uncompromisingly hopeful in a way that reads as naivety until you realise it is the product of discipline, not innocence. She has chosen to hope. Every day. On purpose. For forty years.`,
      secret: `She received a vision in the last temple before it fell. The vision showed Hearthmoor, the well, and a specific sequence of events. She arrived on that sequence. She has been following it since. She has not told anyone because the vision also showed what happens if she deviates, and it was not good.`,
    },
  },

  // ── Enemy lore codex ──────────────────────────────────────────
  bestiary: {
    GOBLIN:   { title:'Goblins', text:`Not born — made. Void energy crystallising around ambient fear and hunger produces these. They are not intelligent but they are persistent and they learn from what fails to kill them. A goblin that survives three encounters with a warrior will never charge directly again.` },
    WOLF:     { title:'Void Wolves', text:`Once ordinary wolves. Prolonged exposure to Void trace rewrites something in the bone. They do not go rabid — they go cold. Methodical. They have been observed retreating to report back before attacking. What they report back to and how is unknown.` },
    SKELETON: { title:'The Persistent', text:`The Void does not reanimate the dead. It preserves the last intention. A man who died defending something will stand and defend it indefinitely, without flesh, without hunger, without knowing what he was defending is long gone. There is no way to tell them it is over.` },
    TROLL:    { title:'Rift Trolls', text:`Trolls come through the fractured places where the leylines bent under Void pressure. They are not from Aethoria. They are confused, which makes them dangerous. Creatures this large are rarely confused — they are usually the thing other things are confused by.` },
    VOID_KNIGHT: { title:'The Void Knight', text:`A warrior who entered the Void Gate willingly, looking for power. Found it. The power found him in return. He has guarded the third shard for two hundred years. He does not remember why. He only remembers that he must. On his third defeat, if someone is present who speaks to him, he will say one word before the Void reclaims him. The word is a name. It is Lyra\'s name.` },
    STONE_COLOSSUS:    { title:'The Stone Colossus',    text:`Built by the First Weavers as a guardian for the Crown itself. When the Crown shattered, it received no further instructions and defaulted to: protect everything. It does not distinguish between threats and travellers. It has been failing at its purpose for three hundred years and it cannot stop trying.` },
    VOID_STALKER:      { title:'Void Stalkers',         text:`They are invisible when stationary. The Void Stalker is not a creature from beyond — it is a creature of here, rewritten by prolonged Void exposure. What it was before is not determinable. It hunts by waiting, which is why experienced travellers say: if you have not seen anything dangerous for three minutes, run.` },
    SOUL_REAVER:       { title:'Soul Reavers',          text:`Not alive, not undead. A Soul Reaver is what happens when a leyline tears at the intersection of a living mind. The result retains nothing of the original person except the hunger. It drains not blood but intent — the motivating force behind action. Victims of Soul Reavers do not die. They simply stop having reasons to continue.` },
    BONE_GIANT:        { title:'Bone Giants',           text:`The Necropolis predates the kingdoms. Its original inhabitants were not human. The Bone Giants are what they became after three centuries of leyline saturation. They move with terrifying purpose — because they remember, in the way that old bone remembers the shape of muscle, what they were supposed to be protecting. They are still protecting it.` },
    CRYSTAL_WRAITH:    { title:'Crystal Wraiths',       text:`When a Phantom is exposed to Crystal Waste energies for long enough, the crystallisation process that turns leyline power to stone begins to affect them. The result is a wraith that cannot be touched — but can touch everything else. Their blows are cold and dense and they freeze what they hit as surely as ice.` },
    VOID_HORROR:       { title:'Void Horrors',          text:`The largest fragments of Voidlord consciousness that do not qualify as full Voidlords. Too small to think coherently, too large to be merely animals. They act on instinct — Void instinct, which is to say: consume, expand, persist. A Void Horror that has been consuming in one location for more than a year begins to develop something resembling purpose. It is not better when this happens.` },
    BONE_TYRANT:       { title:'The Bone Tyrant',       text:`The last king of Verath, absorbed into the Void rather than killed. He has been building outward ever since — the Necropolis is the result of three hundred years of his expansion. He still remembers being a king. He still gives orders. The Bone Giants follow them. He has not forgotten his name. This is unusual for something this far gone. His name was Aldrath. He does not know that Aldric is named for him.` },
    VOID_EMPRESS:      { title:'The Void Empress',      text:`Not a Voidlord. A human who made a different pact than Lyra, for different reasons, and got further into the Void before deciding she preferred it. She has been there for two hundred years and she considers herself improved. She is not wrong. She is also not human anymore in any meaningful sense. She remembers everything about being human, which is why she is so effective at predicting us.` },
    CRYSTAL_TITAN:     { title:'The Crystal Titan',     text:`What a leyline overload leaves behind when the overload is large enough. Not a creature. Not a construct. A consequence. The Crystal Titan is three hundred years of excess leyline energy that achieved enough density to develop a defence reflex. It does not want to kill you. It wants to remain undisturbed. Everything that approaches it is disturbing it.` },
    THE_AMALGAM:       { title:'The Amalgam',           text:`The combined void-residue of every Voidlord who ever lost a piece of itself in Aethoria. It is not a single entity — it is a committee. The committee does not agree on anything except: this is ours. Trying to reason with it does not work because different parts of it give different answers, and the answer it acts on is always the worst available option.` },
    NIGHTMARE_DRAKE:   { title:'Nightmare Drakes',      text:`Drake subspecies found in the deepest volcanic zones, where temperatures reach what should be fatal even to drakes. They survive by burning from the inside — their core temperature is high enough to consume their own tissue, which regenerates faster than it burns. They are, effectively, sustained by barely-controlled destruction. This makes them very angry, which sustains the destruction further.` },
  },

  // ── Regions ────────────────────────────────────────────────────
  regions: {
    HEARTHMOOR: {
      name:  'Hearthmoor',
      text:  `The last safe settlement in central Aethoria, sealed from the Void by Elder Lyra's ancient pact. As long as someone draws water from the well each day, the village endures. Nobody who has tried to leave permanently has made it more than a day's walk before turning back — not because something stops them, but because they forget where they were going.`,
    },
    ELANDOR: {
      name:  'Elandor Plains',
      text:  `Once the breadbasket of Aethoria, the Elandor Plains fed six kingdoms. Now the fields are untended and the trade roads have gone quiet. Bandits and goblin clans have divided the territory between them. The ruins of farming villages dot the landscape — empty, not burned. People just stopped being there one day. The Plains are the clearest evidence that the Forgetting is not metaphor.`,
    },
    WHISPERING: {
      name:  'Whispering Marshes',
      text:  `A fog-shrouded wetland where rare herbs grow at the edges of Void traces and travellers vanish following lights that should not exist. Alchemists prize what can be harvested here. Mira has mapped seventeen distinct Void trace clusters in the Marshes. She does not publish the maps. The lights are not dangerous in themselves — they lead you somewhere, and the somewhere is the problem.`,
    },
    ASHVEIL: {
      name:  'Ashveil Peaks',
      text:  `Volcanic mountains scarred by eruptions that predated the Voidlords by centuries. The dwarven civilization that built here was not destroyed — it was absorbed. The ruins are intact. The tools are still on the workbenches. Whatever the dwarves were working on when they stopped, they left mid-sentence. Hidden in the deepest vault is a prophecy that predicts the Crown's return to the day, written three hundred years before the Crown shattered.`,
    },
    SHATTERED: {
      name:  'Shattered Coast',
      text:  `The southern cliffs took the worst of whatever hit the leylines during the Shattering. Rock that should be solid became fractured overnight. Sea temples that stood for centuries slid beneath the waves. Pirates claimed the strongholds because no one else wanted them. They are, by all accounts, doing fine — the Coast is the one place the Void does not seem interested in, possibly because there is nothing left to consume.`,
    },
    CRYSTAL_WASTES: {
      name:  'Crystal Wastes',
      text:  `The northern reaches where the leylines overloaded and crystallised. The ground here is beautiful and lethal — crystallised leyline energy in formations that predate any civilisation. The crystals hum at a frequency that affects the inner ear. Extended exposure causes visions: accurate ones, which is the dangerous part. Creatures that live here have adapted in ways that make them unlike anything found elsewhere in Aethoria. The Crystal Titan has held the deep wastes for as long as records exist.`,
    },
    NECROPOLIS_REGION: {
      name:  'The Old City (Necropolis)',
      text:  `The eastern plateau hides an ancient city beneath it — older than the kingdoms, older than the Crown. It was inhabited by something that is not human, though related. The Bone Giants that walk it are their descendants. The city is intact, which is remarkable: three centuries of Void exposure, and the buildings stand. The Bone Tyrant maintains them. He does not know why he maintains them. He only knows they should be maintained.`,
    },
    VOID_DEEP: {
      name:  'The Deep Void',
      text:  `Not a place in Aethoria. A place adjacent to Aethoria, accessible through the old gate beneath Hearthmoor's well. The Void is not dark — it is absent. Not the absence of light but the absence of difference. Things in the Void are visible because they contrast with the nothing around them. Visitors report that the Void does not feel hostile. It feels patient. Whatever is in there has been waiting for three hundred years and it is not in a hurry. This is the most frightening thing about it.`,
    },
  },

  // ── Extended factions lore ───────────────────────────────────
  factions_lore: {
    DAWNWARDENS: {
      name: 'The Dawnwardens',
      text: `Paladins sworn to protect the realm from corruption. They emerged in the aftermath of the Shattering when the remaining kingdoms needed someone willing to hold a line. They believe in unity and justice, but their rigid interpretation of both has cost them allies. Their current problem: the corruption they were formed to fight may not be external.`,
    },
    VEILBOUND: {
      name: 'The Veilbound',
      text: `Shadow mages who wield magic the other factions have banned. They did not develop this magic — they inherited it from the scholars who opened the Void Gate. They have been trying to close it ever since, which is why they are feared by people who have not read the actual history. They are not evil. They are desperate and methodical and they keep losing.`,
    },
    IRONFANG: {
      name: 'Ironfang Clan',
      text: `Mercenary fighters who settled in Aethoria three generations ago after their home continent was lost to an unrelated catastrophe. They sell their strength because it is what they have. They are brutal, honourable, and deeply superstitious about the Void in ways that turn out to be mostly correct. Their war-chants contain accurate Void lore that predates the Shattering by centuries. No one has asked them where they learned it.`,
    },
    GUILD_WHISPERS: {
      name: 'Guild of Whispers',
      text: `Spies, assassins, smugglers, and information brokers who have survived every political upheaval by being useful to everyone. They do not cause chaos — they profit from it, which is different. Their current intelligence suggests the Lich King's return is not a myth. They have been selling this information to anyone who will pay, and they cannot understand why nobody believes them.`,
    },
    VERDANT_FLAME: {
      name: 'Circle of Verdant Flame',
      text: `Druids who maintain the surviving wild places of Aethoria through ritual, negotiation, and occasionally violence. They were the first to notice that the Void does not affect forests that have not been cleared — which suggests something about either the Void or forests that nobody has fully worked out. Mira has corresponded with them. She has not told anyone.`,
    },
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
