import { CONFIG    } from '../config.js';
import { AIMemory  } from '../systems/AIMemory.js';

const FALLBACKS = [
  'The shadows grow long in Aethoria. Watch your back beyond the town walls.',
  'The Voidlords stir again near the eastern ruins. Best not to venture there alone.',
  'Gather healing herbs from the grasslands — you will need them before this is over.',
  'The Crystal Shards are scattered across the realm. Find them and restore what was broken.',
  'Many brave souls entered that dungeon to the east. Few returned to tell the tale.',
  'Trade is dangerous these days. Monsters raid every road.',
  'There is power in the old stones on the hilltops. Ancient magic lingers there.',
  'I heard a great warrior passed through here recently. Could that be you?',
];

export class AethoriaAI {
  static async chat(systemPrompt, history, npcName = null) {
    const key = localStorage.getItem('aethoria_api_key');
    if (!key) return this._fallback();

    // Inject memory context into the system prompt
    let fullSystem = systemPrompt;
    if (npcName) {
      const ctx = AIMemory.buildNPCContext(npcName);
      if (ctx) fullSystem += '\n\nPlayer memory (use naturally, don\'t list it):\n' + ctx;
    }

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      CONFIG.CLAUDE_MODEL,
          max_tokens: 240,
          system:     fullSystem,
          messages:   history,
        }),
      });

      if (!res.ok) {
        console.warn('Aethoria AI error:', res.status);
        return 'My thoughts are clouded at this moment, traveler.';
      }

      const data  = await res.json();
      const reply = data.content?.[0]?.text?.trim() || this._fallback();

      // Record a summary of the exchange for future context
      if (npcName && history.length >= 2) {
        const last = history[history.length - 1]?.content || '';
        AIMemory.recordNPCSummary(npcName, last.slice(0, 80) + ' → ' + reply.slice(0, 80));
      }

      return reply;
    } catch (e) {
      console.warn('Aethoria AI fetch failed:', e);
      return this._fallback();
    }
  }

  static _fallback() {
    return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
  }
}
