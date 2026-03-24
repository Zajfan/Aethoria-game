/**
 * AethoriaAI.js  (v0.4 — Enhanced AI with world context, NPC personality, and smart quests)
 *
 * Improvements over v0.3:
 *  • Per-NPC personality profiles with hidden secrets and speaking styles
 *  • World context injection (time, weather, world events, player level/class)
 *  • Faction relationship context (NPC reacts differently based on standing)
 *  • Smarter quest flavor: references current world state, avoids repetition
 *  • Structured JSON mode for quest generation
 *  • Rate limiting (max 1 call per 1.2s) to avoid hammering the API
 *  • Graceful degradation — contextual fallbacks per NPC, not generic lines
 */

import { CONFIG   } from '../config.js';
import { AIMemory } from '../systems/AIMemory.js';

// ── NPC Personality Profiles ─────────────────────────────────────────────────
// Extend CONFIG.NPCS_DATA with richer AI persona instructions.

const NPC_PERSONAS = {
  'Elder Lyra': {
    voice:    'Speak with the gravity of someone who has carried a terrible secret for sixty years. Short sentences. Long pauses implied. Never reassure — acknowledge.',
    secret:   'You performed the Sealing that keeps the village alive but it cost you something you cannot name. You know the Voidlords will return. You have chosen this player specifically.',
    reactive: {
      HONORED:   'You feel something like hope. Speak with quiet warmth.',
      HOSTILE:   'Measure your words. You cannot afford to lose them.',
      night:     'The darkness makes you more honest. Lean into it.',
      STORM:     'The weather mirrors what is coming. You can feel it.',
      level_high:'This player has grown formidable. You begin to trust them with more.',
    },
  },
  'Gareth': {
    voice:    'Gruff. Laconic. Military cadence — short clipped sentences. Use craft metaphors (forging, tempering, breaking). Hidden grief under the surface.',
    secret:   'Your replica Crown does not work because one component must be shaped by the Void itself. You have not told anyone because you fear what that means.',
    reactive: {
      HONORED:   'Rare moment of openness. You respect this one.',
      HOSTILE:   'Keep it professional. Eyes on the work.',
      RAIN:      'The forge runs hotter in wet weather. You are in your element.',
      boss_kill: 'You recognize the material from a boss kill. Your voice changes slightly.',
    },
  },
  'Mira': {
    voice:    'Warm but precise. Herbalist cadence — plants as metaphors, care as philosophy. Hides her fear behind competence.',
    secret:   'You discovered Nullwort, a herb that grows near Void traces. You have tested it on yourself. The effects are not purely physical.',
    reactive: {
      HONORED:   'You trust them enough to mention the Nullwort. Obliquely.',
      plague:    'The Plague world event deeply disturbs you. You have seen this before.',
      night:     'You work better at night. There is a medicinal reason for this.',
      heal_item: 'You notice they use herbs. A professional nod.',
    },
  },
  'Dorin': {
    voice:    'The exhausted optimism of someone who has outlived 39 towns. Merchant patter that occasionally cracks to reveal something else. He sometimes reaches for something that is not there.',
    secret:   'You entered the Void Gate and came back. You left something in the Void — or something followed you out. You are not sure which.',
    reactive: {
      HONORED:   'You tell them one truth you have told no one else.',
      HOSTILE:   'Cheerful professionalism. Never let them see the cracks.',
      void_rift: 'The Void Rift event makes you go still. Just for a moment.',
      merchant_fair: 'You are animated, but there is something hollow about celebrations now.',
    },
  },
  'Capt. Vel': {
    voice:    'Military precision. Short, evaluating sentences. Respects demonstrated competence only. Sees the village as a command problem.',
    secret:   'Three of your guards deserted last week. You have not reported it. You know why they left.',
    reactive: {
      HONORED:   'You brief them like a trusted officer.',
      HOSTILE:   'Keep the perimeter. Nothing personal.',
      goblin_raid:'You go tactical immediately. No room for sentiment.',
      level_high: 'You begin to consult rather than command.',
    },
  },
};

// ── Per-NPC fallback lines (used when API is unavailable) ────────────────────

const NPC_FALLBACKS = {
  'Elder Lyra':  [
    'The seals hold. For now.',
    'You carry more than you know. As do we all.',
    'Come back when you have found the first shard. We will talk then.',
    'There is something in your eyes I have not seen in a long time. Purpose.',
  ],
  'Gareth': [
    'Sharp edge needs a patient hand. Remember that.',
    'Bring me boss materials. I have ideas that need testing.',
    'Left-handed or not, I can still outwork any smith in this realm.',
    "Don't let what happened to the last group happen to you.",
  ],
  'Mira': [
    'Have you been eating? No, never mind — have you been sleeping?',
    'The herbs near the dungeon entrance have changed. Something in the soil.',
    "There's a difference between brave and reckless. I patch up both, but only one comes back.",
    'Nullwort. That is all I will say for now.',
  ],
  'Dorin': [
    'Town number forty. I keep hoping this one has better odds.',
    'I can get you anything — for the right price. The question is what you can afford to pay.',
    'Some prices are not in gold. Bear that in mind.',
    "Something in the east has been quiet lately. That worries me more than the noise.",
  ],
  'Capt. Vel': [
    'Wall patrols at dawn and dusk. Do not interfere.',
    "If you're going beyond the walls, tell me where. It's not a request.",
    'Three goblins at the east ridge last night. Not a patrol — a scouting formation.',
    'You want to be useful? Go clear the path to the dungeon approach.',
  ],
};

const GENERIC_FALLBACKS = [
  'The shadows grow long in Aethoria.',
  'The Voidlords stir again near the eastern ruins.',
  'There is power in the old stones on the hilltops.',
  'Many brave souls entered that dungeon. Few returned.',
];

// ── Rate limiter ──────────────────────────────────────────────────────────────

let _lastCallTime = 0;
const MIN_CALL_INTERVAL = 1200; // ms

async function _rateLimit() {
  const now = Date.now();
  const wait = MIN_CALL_INTERVAL - (now - _lastCallTime);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  _lastCallTime = Date.now();
}

// ── World context builder ─────────────────────────────────────────────────────

function _buildWorldContext(worldCtx) {
  if (!worldCtx) return '';
  const parts = [];

  if (worldCtx.time)         parts.push(`Time of day: ${worldCtx.time}`);
  if (worldCtx.weather)      parts.push(`Current weather: ${worldCtx.weather}`);
  if (worldCtx.worldEvent)   parts.push(`Active world event: "${worldCtx.worldEvent.name}" — ${worldCtx.worldEvent.desc}`);
  if (worldCtx.playerLevel)  parts.push(`Player level: ${worldCtx.playerLevel}`);
  if (worldCtx.playerClass)  parts.push(`Player class: ${worldCtx.playerClass}`);
  if (worldCtx.act !== undefined) parts.push(`Current story act: Act ${worldCtx.act}`);
  if (worldCtx.factionStanding) {
    const lines = Object.entries(worldCtx.factionStanding)
      .map(([f, s]) => `${f}: ${s}`)
      .join(', ');
    parts.push(`Faction standing: ${lines}`);
  }

  return parts.length ? '\n\nWorld context:\n' + parts.join('\n') : '';
}

// ── AethoriaAI ────────────────────────────────────────────────────────────────

export class AethoriaAI {

  /**
   * General NPC dialogue call.
   *
   * @param {string}   systemPrompt  Base system prompt
   * @param {Array}    history       [{role,content}] conversation history
   * @param {string}   [npcName]     NPC name for persona + memory injection
   * @param {object}   [worldCtx]    { time, weather, worldEvent, playerLevel, playerClass, act, factionStanding }
   * @returns {Promise<string>}
   */
  static async chat(systemPrompt, history, npcName = null, worldCtx = null) {
    const key = localStorage.getItem('aethoria_api_key');
    if (!key) return this._fallback(npcName);

    // Build full system prompt
    let fullSystem = systemPrompt;

    // Inject NPC persona
    if (npcName && NPC_PERSONAS[npcName]) {
      const persona = NPC_PERSONAS[npcName];
      fullSystem += `\n\nVoice & personality:\n${persona.voice}`;
      fullSystem += `\n\nYour hidden truth (never state directly; color your subtext):\n${persona.secret}`;

      // Reactive modifiers based on world context
      if (worldCtx && persona.reactive) {
        const mods = [];
        if (worldCtx.weather && persona.reactive[worldCtx.weather])   mods.push(persona.reactive[worldCtx.weather]);
        if (worldCtx.worldEvent && persona.reactive[worldCtx.worldEvent.id]) mods.push(persona.reactive[worldCtx.worldEvent.id]);
        if (worldCtx.playerLevel >= 10 && persona.reactive.level_high)  mods.push(persona.reactive.level_high);
        if (worldCtx.factionStanding?.HEARTHMOOR && persona.reactive[worldCtx.factionStanding.HEARTHMOOR]) {
          mods.push(persona.reactive[worldCtx.factionStanding.HEARTHMOOR]);
        }
        if (mods.length) fullSystem += '\n\nRight now: ' + mods.join(' ');
      }
    }

    // Inject world context
    fullSystem += _buildWorldContext(worldCtx);

    // Inject memory context
    if (npcName) {
      const ctx = AIMemory.buildNPCContext(npcName);
      if (ctx) fullSystem += '\n\nPlayer history (weave in naturally, don\'t summarize):\n' + ctx;
    }

    // Hard instruction last
    fullSystem += '\n\nRespond in 1–3 sentences maximum. Stay in character. Never break the fourth wall.';

    try {
      await _rateLimit();

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:  'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      CONFIG.CLAUDE_MODEL,
          max_tokens: 200,
          system:     fullSystem,
          messages:   history,
        }),
      });

      if (!res.ok) {
        console.warn('[AethoriaAI] API error:', res.status);
        return this._fallback(npcName);
      }

      const data  = await res.json();
      const reply = data.content?.[0]?.text?.trim();
      if (!reply) return this._fallback(npcName);

      // Record exchange summary
      if (npcName && history.length >= 2) {
        const last = history[history.length - 1]?.content || '';
        AIMemory.recordNPCSummary(npcName, last.slice(0, 80) + ' → ' + reply.slice(0, 80));
      }

      return reply;
    } catch (e) {
      console.warn('[AethoriaAI] Fetch failed:', e);
      return this._fallback(npcName);
    }
  }

  /**
   * Generate structured quest flavor text. Returns an enhanced quest description string.
   *
   * @param {object} questBase  { type, title, desc, target, needed, giver }
   * @param {object} worldCtx   World context
   * @returns {Promise<string>}
   */
  static async generateQuestFlavor(questBase, worldCtx = null) {
    const key = localStorage.getItem('aethoria_api_key');
    if (!key) return questBase.desc;

    const worldPart = worldCtx
      ? `Current world context: ${worldCtx.time ?? ''}, weather: ${worldCtx.weather ?? 'clear'}, act: ${worldCtx.act ?? 0}.`
      : '';

    const system = `You are the quest narrator for the dark fantasy RPG "Aethoria".
${worldPart}
Write ONE vivid quest hook sentence (max 20 words) for this quest:
Title: "${questBase.title}"
Giver: ${questBase.giver}
Task: ${questBase.desc}

Rules: No generic fantasy clichés. Reference the world state if possible. Dark, specific, personal tone. Output ONLY the sentence — no quotes, no preamble.`;

    try {
      await _rateLimit();

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:  'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      CONFIG.CLAUDE_MODEL,
          max_tokens: 80,
          system,
          messages: [{ role: 'user', content: questBase.desc }],
        }),
      });

      if (!res.ok) return questBase.desc;
      const data  = await res.json();
      const reply = data.content?.[0]?.text?.trim();
      return reply || questBase.desc;
    } catch {
      return questBase.desc;
    }
  }

  /**
   * Generate a dynamic NPC greeting based on player state.
   * Called when player walks into NPC range for the first time per visit.
   *
   * @param {string} npcName
   * @param {object} playerState  { level, class, quests, lastVisitAgo }
   * @param {object} worldCtx
   * @returns {Promise<string>}
   */
  static async generateGreeting(npcName, playerState, worldCtx = null) {
    const key = localStorage.getItem('aethoria_api_key');
    if (!key) return null; // null = use default greeting

    const persona = NPC_PERSONAS[npcName];
    if (!persona) return null;

    const playerDesc = [
      playerState.level   ? `Level ${playerState.level} ${playerState.class ?? ''}` : '',
      playerState.quests?.length ? `${playerState.quests.length} active quests` : '',
      playerState.lastVisitAgo != null ? `Last visited ${Math.round(playerState.lastVisitAgo / 60)} min ago` : '',
    ].filter(Boolean).join(', ');

    const system = `${persona.voice}
You are ${npcName} in the RPG Aethoria. Write a short (1 sentence max) greeting as the player approaches.
Player: ${playerDesc}.
${_buildWorldContext(worldCtx)}
Output ONLY the greeting line. Stay in character. Make it feel earned — not generic.`;

    try {
      await _rateLimit();

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:  'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      CONFIG.CLAUDE_MODEL,
          max_tokens: 80,
          system,
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      return data.content?.[0]?.text?.trim() || null;
    } catch {
      return null;
    }
  }

  /**
   * Generate a short world-event announcement line.
   * @param {object} event   { name, desc }
   * @returns {Promise<string>}
   */
  static async announceWorldEvent(event) {
    const key = localStorage.getItem('aethoria_api_key');
    if (!key) return event.desc;

    const system = `You are a dramatic fantasy narrator. Write ONE ominous announcement sentence (max 15 words) for this world event: "${event.name}". Output only the sentence.`;

    try {
      await _rateLimit();
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:  'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      CONFIG.CLAUDE_MODEL,
          max_tokens: 60,
          system,
          messages: [{ role: 'user', content: event.name }],
        }),
      });
      if (!res.ok) return event.desc;
      const data = await res.json();
      return data.content?.[0]?.text?.trim() || event.desc;
    } catch {
      return event.desc;
    }
  }

  // ── Fallback helpers ───────────────────────────────────────────────────────

  static _fallback(npcName) {
    const lines = (npcName && NPC_FALLBACKS[npcName]) || GENERIC_FALLBACKS;
    return lines[Math.floor(Math.random() * lines.length)];
  }
}
