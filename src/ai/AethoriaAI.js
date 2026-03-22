import { CONFIG } from '../config.js';

const FALLBACKS = [
  'The shadows grow long in Aethoria, traveler. Watch your back beyond the town walls.',
  'I heard the Voidlords stir again near the eastern ruins. Best not to venture there alone.',
  'Gather healing herbs from the grasslands — you will need them before this is over.',
  'The Crystal Shards are scattered across the realm. Find them and restore what was broken.',
  'Many brave souls entered that dungeon to the east. Few returned to tell the tale.',
  'Trade is dangerous these days. Monsters raid the roads between villages.',
  'There is power in the old stones on the hilltops. Ancient magic lingers there.',
];

export class AethoriaAI {
  static async chat(systemPrompt, history) {
    const key = localStorage.getItem('aethoria_api_key');
    if (!key) return this._fallback();

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':    'application/json',
          'x-api-key':       key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      CONFIG.CLAUDE_MODEL,
          max_tokens: 220,
          system:     systemPrompt,
          messages:   history,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn('Aethoria AI error:', err);
        return 'My thoughts are clouded at this moment, traveler. Ask me again shortly.';
      }

      const data = await res.json();
      return data.content?.[0]?.text?.trim() || this._fallback();
    } catch (e) {
      console.warn('Aethoria AI fetch failed:', e);
      return this._fallback();
    }
  }

  static _fallback() {
    return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
  }
}
