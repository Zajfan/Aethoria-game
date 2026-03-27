/**
 * HUD.js
 * HTML/CSS-based HUD for the Aethoria RPG.
 *
 * Fully DOM-driven — no Three.js or Phaser dependency.
 * All styling uses a dark fantasy RPG theme:
 *   background #0a0a0f, gold accents #d4af37, monospace font.
 */

import { CONFIG }            from '../config.js';
import { ACHIEVEMENTS }      from '../systems/AchievementSystem.js';
import { ACTS }              from '../systems/StorySystem.js';

// ── Design constants ──────────────────────────────────────────────────────────

const THEME = {
  bg:        '#0a0a0f',
  bgPanel:   'rgba(8,8,16,0.94)',
  gold:      '#d4af37',
  red:       '#cc3333',
  blue:      '#3366cc',
  green:     '#33aa55',
  grey:      '#555566',
  border:    '1px solid rgba(212,175,55,0.45)',
  radius:    '4px',
  font:      "'Courier New', Courier, monospace",
};

const MSG_COLORS = {
  quest:  '#5588ff',
  damage: '#ff6655',
  story:  '#d4af37',
  system: '#888899',
  loot:   '#88ff88',
  boss:   '#dd88ff',
};

// ── CSS injection (once) ───────────────────────────────────────────────────────

let _cssInjected = false;
function injectCSS() {
  if (_cssInjected) return;
  _cssInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    /* HUD root overlay */
    #ui-overlay {
      position: fixed; inset: 0;
      pointer-events: none;
      z-index: 100;
      font-family: ${THEME.font};
    }
    #ui-overlay * { box-sizing: border-box; }

    /* ── Panel base ── */
    .hud-panel {
      position: absolute;
      background: ${THEME.bgPanel};
      border: ${THEME.border};
      border-radius: ${THEME.radius};
      color: #ccccdd;
      pointer-events: all;
      backdrop-filter: blur(4px);
    }

    /* ── Stats bar ── */
    #hud-stats {
      top: 12px; left: 12px;
      padding: 10px 14px 8px;
      min-width: 200px;
    }
    #hud-stats .stat-name  { color: ${THEME.gold}; font-size:13px; margin-bottom:6px; }
    #hud-stats .stat-class { color: #aaaacc; font-size:10px; }
    .bar-wrap  { display:flex; align-items:center; gap:6px; margin-bottom:4px; }
    .bar-label { color:#888899; font-size:10px; width:22px; text-align:right; }
    .bar-track {
      flex: 1; height:8px; background:#1a1a22;
      border-radius:4px; overflow:hidden; border:1px solid #333;
    }
    .bar-fill  { height:100%; border-radius:4px; transition: width 0.15s ease; }
    .bar-num   { color:#aaaacc; font-size:10px; min-width:58px; }
    #bar-hp-fill  { background: #cc3333; }
    #bar-xp-fill  { background: #336acc; }
    #hud-gold  { color:#e8cc44; font-size:11px; margin-top:4px; }
    #hud-level { color:${THEME.gold}; font-size:12px; }

    /* ── Minimap ── */
    #hud-minimap {
      bottom: 12px; right: 12px;
      padding: 8px;
      width: 196px;
    }
    #hud-minimap canvas { display:block; border-radius:3px; image-rendering:pixelated; }
    #minimap-label { text-align:center; font-size:8px; color:${THEME.grey}; margin-top:4px; }

    /* ── Combat log ── */
    #hud-log {
      bottom: 12px; left: 12px;
      padding: 8px 12px;
      max-width: 380px;
      pointer-events: none;
    }
    .log-line { font-size:11px; line-height:1.45; opacity:0.9; }

    /* ── Quest tracker ── */
    #hud-quests {
      top: 12px; right: 12px;
      padding: 10px 14px;
      min-width: 240px;
      max-width: 280px;
    }
    #hud-quests .qt-title { color:${THEME.gold}; font-size:11px; margin-bottom:8px; }
    .qt-quest { margin-bottom:10px; }
    .qt-name  { color:#aaccff; font-size:11px; }
    .qt-desc  { color:#666677; font-size:9px; margin:2px 0 4px; }
    .qt-prog-track { height:5px; background:#1a1a22; border-radius:3px; overflow:hidden; border:1px solid #333; }
    .qt-prog-fill  { height:100%; background:#3366cc; border-radius:3px; transition:width 0.2s; }
    .qt-prog-txt   { font-size:9px; color:#888899; margin-top:2px; }

    /* ── Day/night clock ── */
    #hud-clock {
      top: 12px; left: 50%; transform: translateX(-50%);
      padding: 5px 14px;
      font-size: 11px;
      color: #aaaacc;
      pointer-events: none;
    }

    /* ── Full-screen overlays ── */
    .hud-fullscreen {
      position: fixed; inset: 0;
      background: rgba(4,4,10,0.96);
      z-index: 300;
      display: flex; flex-direction:column;
      align-items: center; justify-content: center;
      pointer-events: all;
      overflow-y: auto;
    }
    .hud-fullscreen .fs-title {
      color: ${THEME.gold}; font-size:18px;
      margin-bottom:20px; letter-spacing:2px;
      text-shadow: 0 0 12px ${THEME.gold};
    }
    .hud-fullscreen .fs-close {
      position:fixed; top:18px; right:22px;
      font-size:20px; color:#884444; cursor:pointer;
      background:none; border:none; font-family:${THEME.font};
    }
    .hud-fullscreen .fs-close:hover { color:#ff6666; }

    /* ── Inventory ── */
    #hud-inventory { display:none; }
    .inv-tabs { display:flex; gap:6px; margin-bottom:14px; }
    .inv-tab  {
      padding:4px 14px; font-size:11px; cursor:pointer;
      background:#111; border:1px solid #333; border-radius:3px;
      color:#888; font-family:${THEME.font};
    }
    .inv-tab.active { border-color:${THEME.gold}; color:${THEME.gold}; }
    .inv-grid {
      display:grid; grid-template-columns: repeat(5,60px);
      gap:6px; max-width:340px;
    }
    .inv-slot {
      width:60px; height:60px;
      background:#0d0d18; border:1px solid #333; border-radius:3px;
      display:flex; flex-direction:column; align-items:center;
      justify-content:center; cursor:pointer; padding:4px;
      font-size:9px; color:#aaaacc; text-align:center;
      transition: border-color 0.1s;
    }
    .inv-slot:hover        { border-color:${THEME.gold}; }
    .inv-slot .slot-name   { font-size:8px; color:#aaaacc; margin-top:3px; word-break:break-word; }
    .inv-slot .slot-icon   { font-size:20px; }
    .inv-slot .slot-qty    { font-size:9px; color:${THEME.gold}; }
    .inv-slot.equipped     { border-color:#44cc88; background:#061210; }
    .inv-equip-row { display:flex; gap:20px; margin-bottom:18px; }
    .inv-equip-box {
      width:80px; height:80px;
      background:#0d0d18; border:1px solid #334; border-radius:4px;
      display:flex; flex-direction:column;
      align-items:center; justify-content:center;
      font-size:9px; color:#666677; text-align:center;
    }
    .craft-grid { max-width:420px; }
    .craft-row  {
      display:flex; align-items:center; gap:12px;
      padding:8px; border:1px solid #222; border-radius:3px;
      margin-bottom:6px; cursor:pointer; transition:background 0.1s;
    }
    .craft-row:hover { background:#111; }
    .craft-btn  {
      padding:4px 10px; font-size:10px; cursor:pointer;
      background:#111; border:1px solid ${THEME.gold};
      color:${THEME.gold}; border-radius:3px; font-family:${THEME.font};
    }
    .craft-btn:hover { background:#1a1500; }
    .craft-btn:disabled { border-color:#333; color:#444; cursor:default; }

    /* ── Dialogue panel ── */
    #hud-dialogue {
      position:fixed;
      bottom:0; left:0; right:0;
      height:220px;
      background:${THEME.bgPanel};
      border-top:${THEME.border};
      display:none; flex-direction:column;
      padding:12px 18px;
      z-index:280;
      pointer-events:all;
    }
    #hud-dialogue.open { display:flex; }
    #dlg-header { display:flex; align-items:center; gap:12px; margin-bottom:8px; }
    #dlg-portrait {
      width:52px; height:52px; border-radius:4px;
      background:#1a1230; border:1px solid ${THEME.gold};
      display:flex; align-items:center; justify-content:center;
      font-size:24px; flex-shrink:0;
    }
    #dlg-npc-name  { color:${THEME.gold}; font-size:13px; }
    #dlg-npc-role  { color:#888899; font-size:10px; }
    #dlg-close     { margin-left:auto; cursor:pointer; color:#884444; font-size:18px; background:none; border:none; font-family:${THEME.font}; }
    #dlg-close:hover { color:#ff6666; }
    #dlg-text      { flex:1; color:#ccccdd; font-size:12px; overflow-y:auto; line-height:1.5; margin-bottom:8px; }
    #dlg-typing    { color:#555566; font-size:12px; margin-bottom:8px; animation:blink 1s infinite; }
    @keyframes blink { 50%{opacity:0} }
    #dlg-input-row { display:flex; gap:8px; }
    #dlg-input     {
      flex:1; background:#0e0e18; border:1px solid #334; border-radius:3px;
      color:#ccccdd; padding:6px 10px; font-family:${THEME.font}; font-size:12px;
      outline:none;
    }
    #dlg-input:focus { border-color:${THEME.gold}; }
    #dlg-send      {
      padding:6px 14px; background:none; border:1px solid ${THEME.gold};
      color:${THEME.gold}; cursor:pointer; border-radius:3px; font-family:${THEME.font};
      font-size:12px;
    }
    #dlg-send:hover { background:#1a1500; }
    #dlg-trade-btn {
      padding:4px 12px; background:none; border:1px solid #cc9922;
      color:#cc9922; cursor:pointer; border-radius:3px; font-family:${THEME.font};
      font-size:11px; margin-left:8px;
    }

    /* ── World map ── */
    #hud-map { display:none; }
    #world-map-canvas { display:block; border-radius:4px; image-rendering:pixelated; max-width:90vw; max-height:80vh; }

    /* ── Skill tree ── */
    #hud-skills { display:none; }
    .skill-grid { display:flex; flex-wrap:wrap; gap:12px; max-width:520px; justify-content:center; }
    .skill-card {
      width:150px; padding:10px 12px;
      background:#0d0d18; border:1px solid #334; border-radius:4px;
      display:flex; flex-direction:column; gap:4px;
    }
    .skill-card.own-class  { border-color:#336; }
    .skill-card .sk-name   { color:#aaccff; font-size:12px; }
    .skill-card .sk-desc   { color:#666677; font-size:9px; line-height:1.35; }
    .skill-card .sk-ranks  { display:flex; gap:3px; margin-top:4px; }
    .skill-card .sk-pip    { width:12px; height:5px; border-radius:2px; background:#1a1a22; border:1px solid #333; }
    .skill-card .sk-pip.on { background:${THEME.gold}; }
    .skill-learn {
      padding:3px 8px; margin-top:6px; font-size:10px; cursor:pointer;
      background:none; border:1px solid ${THEME.gold}; color:${THEME.gold};
      border-radius:3px; font-family:${THEME.font};
    }
    .skill-learn:disabled { border-color:#333; color:#444; cursor:default; }

    /* ── Act banner ── */
    #hud-act-banner {
      position:fixed; left:50%; top:30%;
      transform:translate(-50%,-50%);
      text-align:center;
      pointer-events:none;
      z-index:400;
      opacity:0;
      transition:opacity 0.5s;
    }
    #hud-act-banner.show { opacity:1; }
    #hud-act-banner .act-tag   { font-size:11px; color:#888899; letter-spacing:3px; margin-bottom:6px; }
    #hud-act-banner .act-title { font-size:28px; color:${THEME.gold}; text-shadow:0 0 20px ${THEME.gold}; letter-spacing:2px; }
    #hud-act-banner .act-sub   { font-size:12px; color:#aaaacc; margin-top:8px; }

    /* ── Achievement popup ── */
    #hud-achievement {
      position:fixed; top:-80px; right:16px;
      width:300px; padding:12px 16px;
      background:${THEME.bgPanel};
      border:1px solid ${THEME.gold};
      border-radius:4px;
      transition:top 0.35s cubic-bezier(0.34,1.56,0.64,1);
      pointer-events:none;
      z-index:450;
    }
    #hud-achievement.show  { top:16px; }
    #hud-achievement .ach-label { font-size:9px; color:${THEME.gold}; letter-spacing:2px; }
    #hud-achievement .ach-name  { font-size:14px; color:#fff; margin-top:3px; }
    #hud-achievement .ach-desc  { font-size:10px; color:#888899; margin-top:2px; }

    /* ── World event banner ── */
    #hud-event-banner {
      position:fixed; left:50%; top:90px;
      transform:translateX(-50%);
      max-width:520px; width:90vw;
      padding:14px 20px; text-align:center;
      background:rgba(4,4,18,0.94);
      border-radius:4px;
      pointer-events:none; z-index:420;
      opacity:0; transition:opacity 0.4s;
    }
    #hud-event-banner.show { opacity:1; }
    #hud-event-banner .ev-name { font-size:14px; margin-bottom:4px; }
    #hud-event-banner .ev-desc { font-size:11px; color:#aaaacc; }

    /* ── Controls hint ── */
    #hud-hint {
      position:fixed; bottom:6px; left:50%;
      transform:translateX(-50%);
      font-size:9px; color:#333344;
      pointer-events:none; z-index:90;
      white-space:nowrap;
    }

    /* ── Trade panel ── */
    #hud-trade { display:none; }
    .trade-section { margin-bottom:18px; }
    .trade-title   { color:${THEME.gold}; font-size:12px; margin-bottom:8px; }
    .trade-row {
      display:flex; align-items:center; gap:10px;
      padding:6px; border-bottom:1px solid #1a1a22;
    }
    .trade-row:hover { background:#111; }
    .trade-item-name { flex:1; font-size:11px; color:#ccccdd; }
    .trade-price     { font-size:11px; color:#e8cc44; min-width:50px; text-align:right; }
    .trade-btn       {
      padding:3px 10px; font-size:10px; cursor:pointer;
      background:none; border:1px solid ${THEME.gold}; color:${THEME.gold};
      border-radius:3px; font-family:${THEME.font};
    }
    .trade-btn:hover { background:#1a1500; }

    /* ── Scrollbars ── */
    .hud-panel ::-webkit-scrollbar        { width:5px; }
    .hud-panel ::-webkit-scrollbar-track  { background:#111; }
    .hud-panel ::-webkit-scrollbar-thumb  { background:#333; border-radius:3px; }

    /* ══════════════════════════════════════════════════════
       MOBILE UI — Complete redesign v0.6
       Layout:
         Left  : large joystick (bottom-left quadrant)
         Right : 2×2 ability grid (bottom-right)
         Right : 3 core action buttons in arc above ability grid
         Top-right: quick-access menu strip (map, inv, quests, stat)
       ══════════════════════════════════════════════════════ */
    #mobile-joystick {
      position: fixed;
      width: 150px; height: 150px;
      border-radius: 50%;
      border: 2px solid rgba(212,175,55,0.35);
      background: rgba(255,255,255,0.04);
      pointer-events: none;
      display: none;
      z-index: 92;
      transform: translate(-50%, -50%);
      box-shadow: 0 0 20px rgba(0,0,0,0.4), inset 0 0 30px rgba(0,0,0,0.3);
    }
    #mobile-joystick-knob {
      position: absolute;
      width: 52px; height: 52px;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, rgba(212,175,55,0.7), rgba(150,120,30,0.5));
      border: 2px solid rgba(212,175,55,0.9);
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.5);
    }

    /* ── Core action buttons (right side arc) ── */
    #mobile-action-arc {
      position: fixed;
      bottom: 180px; right: 20px;
      display: none;
      flex-direction: column;
      gap: 10px;
      z-index: 96;
      pointer-events: none;
      align-items: flex-end;
    }

    /* ── Ability grid (2×2, bottom right) ── */
    #mobile-ability-grid {
      position: fixed;
      bottom: 20px; right: 20px;
      display: none;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      z-index: 96;
      pointer-events: none;
    }

    /* ── Quick menu strip (top right) ── */
    #mobile-quick-menu {
      position: fixed;
      top: 12px; right: 12px;
      display: none;
      flex-direction: column;
      gap: 6px;
      z-index: 97;
      pointer-events: none;
    }

    /* ── Base button style ── */
    .mobile-btn {
      border-radius: 50%;
      background: rgba(6,6,18,0.90);
      border: 1.5px solid rgba(212,175,55,0.55);
      color: ${THEME.gold};
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      pointer-events: auto;
      user-select: none;
      -webkit-user-select: none;
      -webkit-tap-highlight-color: transparent;
      box-shadow: 0 3px 12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05);
      flex-shrink: 0;
      transition: background 0.1s, transform 0.1s;
      font-size: 20px;
      width: 58px; height: 58px;
    }
    .mobile-btn.large { width: 64px; height: 64px; font-size: 24px; }
    .mobile-btn.small { width: 44px; height: 44px; font-size: 16px; }
    .mobile-btn.ability {
      width: 60px; height: 60px; border-radius: 10px;
      flex-direction: column; gap: 0; font-size: 22px;
      border-color: rgba(100,120,180,0.55);
      position: relative;
    }
    .mobile-btn:active { background: rgba(212,175,55,0.18); transform: scale(0.90); }
    .mobile-btn.attack-btn {
      border-color: rgba(255,80,50,0.7);
      background: rgba(20,4,4,0.92);
      width: 70px; height: 70px; font-size: 26px;
    }
    .mobile-btn.attack-btn:active { background: rgba(255,80,50,0.25); }

    /* ── Mobile cooldown overlay ── */
    .mob-cd {
      position:absolute; inset:0; background:rgba(0,0,0,0.72);
      border-radius:9px; display:none; align-items:center; justify-content:center;
      font-size:12px; font-weight:bold; color:#fff;
      font-family:'Courier New',monospace; pointer-events:none;
    }
    .mob-ability-name {
      font-size:7px; color:rgba(180,200,255,0.7); letter-spacing:0.5px;
      line-height:1; margin-top:1px; text-align:center; pointer-events:none;
    }

    /* ── Only show on touch devices ── */
    @media (hover: none) and (pointer: coarse) {
      #mobile-action-arc  { display: flex; }
      #mobile-ability-grid { display: grid; }
      #mobile-quick-menu   { display: flex; }
    }

    /* Legacy selector kept for joystick show/hide logic */
    #mobile-buttons { display: none; }
  `;
  document.head.appendChild(style);
}

// ── Item type → icon emoji ─────────────────────────────────────────────────────

const ITEM_ICONS = {
  currency: '🪙', weapon: '⚔️', armor: '🛡️',
  material: '🔩', consumable: '🧪', readable: '📜',
};
function itemIcon(itemKey) {
  const item = CONFIG.ITEMS[itemKey];
  return item ? (ITEM_ICONS[item.type] || '📦') : '📦';
}

// ── HUD class ──────────────────────────────────────────────────────────────────

export class HUD {
  /**
   * @param {import('../engine/EventBus.js').EventBus} eventBus
   * @param {import('../systems/QuestSystem.js').QuestSystem|null}  questSystem
   * @param {import('../systems/TradeSystem.js').TradeSystem|null}  tradeSystem
   */
  constructor(eventBus, questSystem = null, tradeSystem = null) {
    this.eventBus      = eventBus;
    this.questSystem   = questSystem;
    this.tradeSystem   = tradeSystem;
    this.factionSystem  = null;   // v0.4 — set via openDialogue / bindGame
    this._enchantSystem = null;   // v0.5
    this._combatSystem  = null;   // v0.5

    this._gameScene   = null;
    this._player      = null;
    this._mapData     = null;
    this._dialogueNPC = null;
    this._tradeNPC    = null;
    this._mmInterval  = null;
    this._logLines    = [];   // [{ text, color }]
    this._achTimer    = null;
    this._worldCtx    = null;  // v0.4

    // Panel state flags
    this.invOpen      = false;
    this.mapOpen      = false;
    this.questOpen    = false;
    this.skillOpen    = false;
    this.tradeOpen    = false;
    this.factionOpen  = false;  // v0.4
    this.enchantOpen  = false;  // v0.5
    this.codexOpen    = false;  // v0.6
    this.achOpen      = false;  // v0.7
    this.dailyOpen    = false;  // v0.7
    this.statOpen     = false;  // v0.6
    this._codexSystem   = null;   // v0.6
    this._regionSystem  = null;   // v0.6
    this._abilitySystem = null;   // v0.6

    injectCSS();
    this._ensureOverlay();
    this._buildAll();
    this._bindKeys();
  }

  _ensureOverlay() {
    if (!document.getElementById('ui-overlay')) {
      const el = document.createElement('div');
      el.id = 'ui-overlay';
      document.body.appendChild(el);
    }
    this._overlay = document.getElementById('ui-overlay');
  }

  // ── Build panels ────────────────────────────────────────────────────────────

  _buildAll() {
    this._buildStats();
    this._buildAbilityBar();
    this._buildMinimap();
    this._buildLog();
    this._buildQuestTracker();
    this._buildClock();
    this._buildInventory();
    this._buildDialogue();
    this._buildWorldMap();
    this._buildSkillTree();
    this._buildActBanner();
    this._buildAchievementPopup();
    this._buildEventBanner();
    this._buildHint();
    this._buildFactions();
    this._buildEnchant();
    this._buildCodex();
    this._buildAchievementGallery();
    this._buildDailyChallenges();
    this._buildStatScreen();
    this._buildRegionBanner();
    this._buildScrollReader();
    this._buildMobileControls();
  }

  _el(tag, cls, parent) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (parent) parent.appendChild(el);
    return el;
  }

  // ── Stats bar ───────────────────────────────────────────────────────────────

  _buildStats() {
    const panel = this._el('div', 'hud-panel', this._overlay);
    panel.id = 'hud-stats';

    const header = this._el('div', '', panel);
    this._statName  = this._el('div', 'stat-name',  header);
    this._statClass = this._el('div', 'stat-class', header);
    this._statName.textContent  = 'Hero';
    this._statClass.textContent = '[Warrior]';

    this._hpFill   = this._addBar(panel, 'HP', 'bar-hp-fill');
    this._hpNum    = this._hpFill.parentElement.nextElementSibling;
    this._manaFill = this._addBar(panel, 'MP', 'bar-mana-fill');
    this._manaFill.style.background = '#4488ff';
    this._manaNum  = this._manaFill.parentElement.nextElementSibling;
    this._xpFill   = this._addBar(panel, 'XP', 'bar-xp-fill');
    this._xpNum    = this._xpFill.parentElement.nextElementSibling;

    const row     = this._el('div', '', panel);
    row.style.cssText = 'display:flex;gap:14px;margin-top:4px;';
    this._levelEl = this._el('div', '', row);
    this._goldEl  = this._el('div', 'bar-num', row);
    this._levelEl.style.cssText = 'color:#d4af37;font-size:12px;';
    this._goldEl.style.cssText  = 'color:#e8cc44;font-size:11px;';
    this._levelEl.textContent   = 'Lv.1';
    this._goldEl.textContent    = '0g';
  }

  _addBar(parent, label, fillId) {
    const wrap  = this._el('div', 'bar-wrap', parent);
    const lbl   = this._el('div', 'bar-label', wrap);
    lbl.textContent = label;
    const track = this._el('div', 'bar-track', wrap);
    const fill  = this._el('div', 'bar-fill', track);
    fill.id = fillId;
    fill.style.width = '100%';
    const num = this._el('div', 'bar-num', wrap);
    num.textContent = '—';
    return fill;
  }

  _updateStats(s) {
    if (!s) return;
    this._statName.textContent  = s.name || 'Hero';
    this._levelEl.textContent   = 'Lv.' + (s.level || 1);
    this._goldEl.textContent    = (s.gold || 0) + 'g';

    const hpPct = s.maxHp > 0 ? (Math.max(0, s.hp) / s.maxHp * 100).toFixed(1) : 0;
    const xpPct = s.xpNeeded > 0 ? (s.xp / s.xpNeeded * 100).toFixed(1) : 0;

    this._hpFill.style.width = hpPct + '%';
    this._hpFill.style.background =
      (s.hp / s.maxHp > 0.6) ? '#22aa44' :
      (s.hp / s.maxHp > 0.3) ? '#cc8800' : '#cc3333';

    const hpNum = this._hpFill.parentElement?.nextElementSibling;
    if (hpNum) hpNum.textContent = s.hp + '/' + s.maxHp;

    this._xpFill.style.width = xpPct + '%';
    const xpNum = this._xpFill.parentElement?.nextElementSibling;
    if (xpNum) xpNum.textContent = s.xp + '/' + s.xpNeeded;

    if (this._player?.playerClass) {
      const cls = CONFIG.CLASSES[this._player.playerClass];
      this._statClass.textContent = cls ? '[' + cls.name + ']' : '';
    }
  }

  // ── Minimap ─────────────────────────────────────────────────────────────────

  _buildMinimap() {
    const panel  = this._el('div', 'hud-panel', this._overlay);
    panel.id = 'hud-minimap';

    this._mmCanvas = this._el('canvas', '', panel);
    this._mmCanvas.width  = 180;
    this._mmCanvas.height = 180;
    this._mmCanvas.style.cssText = 'width:180px;height:180px;';
    this._mmCtx = this._mmCanvas.getContext('2d');

    this._el('div', '', panel).id = 'minimap-label';
    const lbl = document.getElementById('minimap-label') || panel.lastChild;
    lbl.textContent = 'MAP';

    this._mmInterval = setInterval(() => this._drawMinimap(), 500);
  }

  _drawMinimap() {
    if (!this._mapData) return;
    const ctx  = this._mmCtx;
    const data = this._mapData;
    const rows = data.length;
    const cols = data[0].length;
    const W    = 180;
    const H    = 180;
    const sw   = W / cols;
    const sh   = H / rows;

    const T  = CONFIG.TILES;
    const CM = {
      [T.DEEP_WATER]:    '#0d2137',
      [T.WATER]:         '#1a4a80',
      [T.SAND]:          '#c8a848',
      [T.GRASS]:         '#2d6a30',
      [T.FOREST]:        '#1a4520',
      [T.STONE]:         '#5a5a5a',
      [T.DUNGEON_FLOOR]: '#3a4550',
      [T.DUNGEON_WALL]:  '#141414',
      [T.PATH]:          '#7a5a3a',
      [T.TOWN_FLOOR]:    '#8a9a8a',
    };

    ctx.clearRect(0, 0, W, H);

    // Draw tiles
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = CM[data[r][c]] || '#222233';
        ctx.fillRect(c * sw, r * sh, Math.max(1, sw), Math.max(1, sh));
      }
    }

    if (!this._player) return;
    const px = this._player.position.x / cols * W;
    const pz = this._player.position.z / rows * H;

    // Player dot (white)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, pz, 3, 0, Math.PI * 2);
    ctx.fill();

    // NPC dots (gold)
    if (this._gameScene?.npcs) {
      this._gameScene.npcs.forEach(n => {
        ctx.fillStyle = '#d4af37';
        ctx.beginPath();
        ctx.arc(n.position.x / cols * W, n.position.z / rows * H, 2, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Enemy dots (red, only living)
    if (this._gameScene?.enemies) {
      this._gameScene.enemies.forEach(e => {
        if (e.isDead) return;
        ctx.fillStyle = '#cc3333';
        ctx.beginPath();
        ctx.arc(e.position.x / cols * W, e.position.z / rows * H, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Portal dot (purple)
    if (this._gameScene?._portalPos) {
      const pp = this._gameScene._portalPos;
      ctx.fillStyle = '#8800ff';
      ctx.beginPath();
      ctx.arc(pp.x / cols * W, pp.z / rows * H, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Quest waypoints (cyan diamond) ──────────────────────────────────────
    const activeQuests = this._questSystem?.active ?? this.questSystem?.active ?? [];
    activeQuests.forEach(q => {
      if (!q.waypointX || !q.waypointZ) return;
      const wx = q.waypointX / cols * W;
      const wz = q.waypointZ / rows * H;
      ctx.fillStyle = '#00ffff';
      ctx.save();
      ctx.translate(wx, wz);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-3, -3, 6, 6);
      ctx.restore();
    });

    // ── POI markers (small coloured squares) ────────────────────────────────
    if (this._gameScene?.poiSystem) {
      this._gameScene.poiSystem._pois?.forEach(poi => {
        if (poi.used && !poi.def?.respawn) return;
        const poiColors = {
          SHRINE:'#ffdd44', HEALING_WELL:'#44ccaa', CRYSTAL_NODE:'#cc44ff',
          RUIN:'#aa9977', STANDING_STONE:'#4488ff', MERCHANT_CART:'#ffaa44', GRAVE:'#888888',
        };
        const col = poiColors[poi.typeKey] ?? '#aaaaaa';
        ctx.fillStyle = col;
        ctx.fillRect(poi.tx / cols * W - 1.5, poi.tz / rows * H - 1.5, 3, 3);
      });
    }

    // ── World boss marker (pulsing red skull) ────────────────────────────────
    if (this._gameScene?._worldBoss && !this._gameScene._worldBoss.isDead) {
      const wb = this._gameScene._worldBoss;
      const bx = wb.position.x / cols * W;
      const bz = wb.position.z / rows * H;
      const pulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.004);
      ctx.fillStyle = `rgba(255,0,0,${pulse})`;
      ctx.beginPath();
      ctx.arc(bx, bz, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // ── Saltmere marker (second town dot) ───────────────────────────────────
    const saltmereX = Math.floor(cols * 0.28) / cols * W;
    const saltmereZ = Math.floor(rows * 0.78) / rows * H;
    ctx.fillStyle = '#8a9a8a';
    ctx.fillRect(saltmereX - 3, saltmereZ - 3, 6, 6);
  }

  // ── Combat log ──────────────────────────────────────────────────────────────

  _buildLog() {
    const panel = this._el('div', 'hud-panel', this._overlay);
    panel.id = 'hud-log';
    panel.style.pointerEvents = 'none';
    this._logContainer = panel;
  }

  /**
   * Add a message to the combat log.
   * @param {string} text
   * @param {string} [color='#888899']
   */
  logMsg(text, color = '#888899') {
    this._logLines.push({ text, color });
    if (this._logLines.length > 8) this._logLines.shift();
    this._renderLog();
  }

  _renderLog() {
    this._logContainer.innerHTML = '';
    this._logLines.forEach(({ text, color }) => {
      const line = this._el('div', 'log-line', this._logContainer);
      line.style.color = color;
      line.textContent = text;
    });
  }

  // ── Quest tracker ────────────────────────────────────────────────────────────

  _buildQuestTracker() {
    const panel = this._el('div', 'hud-panel', this._overlay);
    panel.id = 'hud-quests';
    const title = this._el('div', 'qt-title', panel);
    title.textContent = 'ACTIVE QUESTS';
    this._questPanel = panel;
    this._questBody  = this._el('div', '', panel);
  }

  refreshQuests() {
    if (!this._questBody) return;
    this._questBody.innerHTML = '';
    const quests = (this.questSystem?.active || []).slice(0, 3);
    if (quests.length === 0) {
      const empty = this._el('div', '', this._questBody);
      empty.style.cssText = 'font-size:10px;color:#444455;';
      empty.textContent = 'No active quests.';
      return;
    }
    quests.forEach(q => {
      const wrap = this._el('div', 'qt-quest', this._questBody);
      const name = this._el('div', 'qt-name', wrap);
      name.textContent = q.title;
      const desc = this._el('div', 'qt-desc', wrap);
      desc.textContent = q.desc;
      const track = this._el('div', 'qt-prog-track', wrap);
      const fill  = this._el('div', 'qt-prog-fill', track);
      const pct   = q.needed > 0 ? (q.progress / q.needed * 100) : 0;
      fill.style.width = pct + '%';
      const txt   = this._el('div', 'qt-prog-txt', wrap);
      txt.textContent = q.progress + ' / ' + q.needed;
    });
  }

  // ── Clock ────────────────────────────────────────────────────────────────────

  _buildClock() {
    const clock = this._el('div', 'hud-panel', this._overlay);
    clock.id = 'hud-clock';
    clock.style.pointerEvents = 'none';
    this._clockEl = clock;
  }

  // ── Inventory panel ───────────────────────────────────────────────────────────

  _buildInventory() {
    const overlay = this._el('div', 'hud-fullscreen', document.body);
    overlay.id = 'hud-inventory';
    overlay.style.display = 'none';

    const closeBtn = this._el('button', 'fs-close', overlay);
    closeBtn.textContent = '✕';
    closeBtn.onclick = () => this.toggleInventory();

    const title = this._el('div', 'fs-title', overlay);
    title.textContent = '// INVENTORY';

    // Equipment row
    this._invEquipRow = this._el('div', 'inv-equip-row', overlay);
    const wpnBox = this._el('div', 'inv-equip-box', this._invEquipRow);
    wpnBox.innerHTML = '<div style="font-size:20px">⚔️</div><div>Weapon</div>';
    this._invWpnBox = wpnBox;
    const armBox = this._el('div', 'inv-equip-box', this._invEquipRow);
    armBox.innerHTML = '<div style="font-size:20px">🛡️</div><div>Armor</div>';
    this._invArmBox = armBox;

    // Tabs
    const tabs = this._el('div', 'inv-tabs', overlay);
    this._invTabItems  = this._addTab(tabs, 'Items',   () => this._showInvTab('items'));
    this._invTabCraft  = this._addTab(tabs, 'Crafting', () => this._showInvTab('craft'));
    this._invTabItems.classList.add('active');

    // Content area
    this._invContent = this._el('div', '', overlay);
    this._invContent.style.cssText = 'width:100%;max-width:420px;';

    this._invItemGrid = this._el('div', 'inv-grid', this._invContent);
    this._invCraftDiv = this._el('div', 'craft-grid', this._invContent);
    this._invCraftDiv.style.display = 'none';

    this._invOverlay = overlay;
  }

  _addTab(parent, label, onClick) {
    const t = this._el('button', 'inv-tab', parent);
    t.textContent = label;
    t.onclick = () => {
      parent.querySelectorAll('.inv-tab').forEach(e => e.classList.remove('active'));
      t.classList.add('active');
      onClick();
    };
    return t;
  }

  _showInvTab(tab) {
    if (tab === 'items') {
      this._invItemGrid.style.display = 'grid';
      this._invCraftDiv.style.display = 'none';
    } else {
      this._invItemGrid.style.display = 'none';
      this._invCraftDiv.style.display = 'block';
      this._renderCrafting();
    }
  }

  _renderInv(player) {
    if (!player) return;
    this._invItemGrid.innerHTML = '';
    const items = Object.entries(player.inventory || {}).filter(([, qty]) => qty > 0);

    if (items.length === 0) {
      const empty = this._el('div', '', this._invItemGrid);
      empty.style.cssText = 'grid-column:1/-1;color:#444455;font-size:11px;';
      empty.textContent = 'No items.';
      return;
    }

    items.forEach(([key, qty]) => {
      const info = CONFIG.ITEMS[key];
      if (!info) return;
      const slot = this._el('div', 'inv-slot', this._invItemGrid);
      const isWpn = player.equipment?.weapon === key;
      const isArm = player.equipment?.armor  === key;
      if (isWpn || isArm) slot.classList.add('equipped');

      slot.innerHTML = `
        <div class="slot-icon">${itemIcon(key)}</div>
        <div class="slot-name">${info.name}</div>
        ${qty > 1 ? `<div class="slot-qty">×${qty}</div>` : ''}
      `;
      slot.title = info.name + (info.atk ? '  ATK+' + info.atk : '') +
                               (info.def ? '  DEF+' + info.def : '') +
                               (info.heal ? '  HEAL+' + info.heal : '') +
                               '\nValue: ' + info.value + 'g';
      slot.onclick = () => {
        player.useItem(key);
        this._renderInv(player);
      };
    });

    // Equipment display
    const eq = player.equipment || {};
    if (eq.weapon) {
      const wi = CONFIG.ITEMS[eq.weapon];
      this._invWpnBox.innerHTML = `<div style="font-size:20px">⚔️</div><div style="font-size:9px;color:#d4af37;">${wi?.name || eq.weapon}</div>`;
    }
    if (eq.armor) {
      const ai = CONFIG.ITEMS[eq.armor];
      this._invArmBox.innerHTML = `<div style="font-size:20px">🛡️</div><div style="font-size:9px;color:#d4af37;">${ai?.name || eq.armor}</div>`;
    }
  }

  _renderCrafting() {
    if (!this._player) return;
    this._invCraftDiv.innerHTML = '';
    const titleEl = this._el('div', 'trade-title', this._invCraftDiv);
    titleEl.textContent = 'RECIPES';

    CONFIG.RECIPES.forEach(recipe => {
      const row = this._el('div', 'craft-row', this._invCraftDiv);
      const info = CONFIG.ITEMS[recipe.result];
      const nameDiv = this._el('div', '', row);
      nameDiv.style.flex = '1';
      nameDiv.innerHTML = `<div style="font-size:11px;color:#ccccdd;">${itemIcon(recipe.result)} ${info?.name || recipe.result}</div>
        <div style="font-size:9px;color:#666677;">${Object.entries(recipe.materials).map(([k, v]) => `${v}×${CONFIG.ITEMS[k]?.name || k}`).join(', ')}</div>`;

      // Check if can craft
      const canCraft = Object.entries(recipe.materials).every(
        ([k, v]) => (this._player.inventory?.[k] || 0) >= v,
      );
      const btn = this._el('button', 'craft-btn', row);
      btn.textContent = 'Craft';
      btn.disabled = !canCraft;
      btn.onclick = () => {
        if (!canCraft) return;
        Object.entries(recipe.materials).forEach(([k, v]) => this._player.removeItem(k, v));
        this._player.addItem(recipe.result);
        this.eventBus?.emit('craftedItem', { result: recipe.result });
        this._renderCrafting();
        this.logMsg('Crafted: ' + (info?.name || recipe.result), '#88ff88');
      };
    });
  }

  toggleInventory(player) {
    if (player) this._player = player;
    this.invOpen = !this.invOpen;
    this._invOverlay.style.display = this.invOpen ? 'flex' : 'none';
    if (this.invOpen && this._player) {
      this._renderInv(this._player);
      this._showInvTab('items');
    }
  }

  // ── Dialogue panel ────────────────────────────────────────────────────────────

  _buildDialogue() {
    const panel = document.createElement('div');
    panel.id = 'hud-dialogue';
    document.body.appendChild(panel);

    // Header
    const header = this._el('div', '', panel);
    header.id = 'dlg-header';

    this._dlgPortrait = this._el('div', '', header);
    this._dlgPortrait.id = 'dlg-portrait';
    this._dlgPortrait.textContent = '🧙';

    const nameCol = this._el('div', '', header);
    nameCol.style.flex = '1';
    this._dlgNpcName = this._el('div', '', nameCol);
    this._dlgNpcName.id = 'dlg-npc-name';
    this._dlgNpcRole = this._el('div', '', nameCol);
    this._dlgNpcRole.id = 'dlg-npc-role';

    const closeBtn = this._el('button', '', header);
    closeBtn.id = 'dlg-close';
    closeBtn.textContent = '✕';
    closeBtn.onclick = () => this._closeDialogue();

    // Text area
    this._dlgText = this._el('div', '', panel);
    this._dlgText.id = 'dlg-text';

    this._dlgTyping = this._el('div', '', panel);
    this._dlgTyping.id = 'dlg-typing';
    this._dlgTyping.textContent = '...';
    this._dlgTyping.style.display = 'none';

    // Input row
    const inputRow = this._el('div', '', panel);
    inputRow.id = 'dlg-input-row';

    this._dlgInput = this._el('input', '', inputRow);
    this._dlgInput.id = 'dlg-input';
    this._dlgInput.type = 'text';
    this._dlgInput.placeholder = 'Ask something…';
    this._dlgInput.onkeydown = e => {
      if (e.key === 'Enter') { e.stopPropagation(); this._sendDialogue(); }
      e.stopPropagation(); // prevent game keys
    };

    const sendBtn = this._el('button', '', inputRow);
    sendBtn.id = 'dlg-send';
    sendBtn.textContent = 'Send';
    sendBtn.onclick = () => this._sendDialogue();

    this._dlgTradeBtn = this._el('button', '', inputRow);
    this._dlgTradeBtn.id = 'dlg-trade-btn';
    this._dlgTradeBtn.textContent = '🛍 Shop';
    this._dlgTradeBtn.style.display = 'none';
    this._dlgTradeBtn.onclick = () => {
      if (this._dialogueNPC) this._openTrade(this._dialogueNPC);
    };

    this._dlgPanel = panel;
  }

  /**
   * @param {import('../entities/NPC3D.js').NPC3D} npc
   * @param {import('../entities/Player3D.js').Player3D} player
   * @param {import('../systems/QuestSystem.js').QuestSystem} questSystem
   * @param {import('../systems/TradeSystem.js').TradeSystem} tradeSystem
   * @param {object} worldEvents
   */
  async openDialogue(npc, player, questSystem, tradeSystem, worldEvents, worldCtx = null, factionSystem = null, enchantSystem = null, combatSystem = null, codexSystem = null) {
    this._dialogueNPC  = npc;
    this._player       = player;
    this._questSystem  = questSystem || this.questSystem;
    this._tradeSystem  = tradeSystem || this.tradeSystem;
    this._worldEvents  = worldEvents;
    this._worldCtx     = worldCtx;
    if (factionSystem)  this.factionSystem  = factionSystem;
    if (enchantSystem)  this._enchantSystem  = enchantSystem;
    if (combatSystem)   this._combatSystem   = combatSystem;
    if (codexSystem)    this._codexSystem    = codexSystem;

    const nd  = npc.npcData;
    const col = '#' + (nd.color || 0xd4af37).toString(16).padStart(6, '0');

    this._dlgNpcName.textContent  = nd.name;
    this._dlgNpcName.style.color  = col;
    this._dlgNpcRole.textContent  = '[' + nd.role + ']';
    this._dlgPortrait.textContent = { 'Village Elder':'🧙', 'Blacksmith':'⚒️',
      'Herbalist':'🌿', 'Merchant':'🛒', 'Guard Captain':'⚔️' }[nd.role] || '🧑';
    this._dlgPortrait.style.background = col + '22';
    this._dlgPortrait.style.borderColor = col;

    const hasShop = tradeSystem?.hasShop?.(nd.role);
    this._dlgTradeBtn.style.display = hasShop ? 'inline-block' : 'none';

    this._dlgText.textContent   = '';
    this._dlgTyping.style.display = 'block';
    this._dlgPanel.classList.add('open');

    const currentEvent = worldEvents?.getCurrent()?.name || null;
    try {
      const reply = await npc.talk('Hello, I approach you.', player?.stats, currentEvent, this._worldCtx);
      this._dlgTyping.style.display = 'none';
      this._dlgText.textContent = reply;
      this.logMsg(nd.name + ': ' + reply.slice(0, 55) + (reply.length > 55 ? '…' : ''), col);
    } catch (_) {
      this._dlgTyping.style.display = 'none';
      this._dlgText.textContent = 'Greetings, traveller.';
    }

    // Offer a quest occasionally (v0.4: pass worldCtx for smarter flavor)
    if (this._questSystem && Math.random() < 0.4) {
      setTimeout(() => {
        this._questSystem.generateQuest(player?.stats, nd.name, this._worldCtx);
      }, 1200);
    }

    // v0.6 — unlock NPC bio in codex
    this._codexSystem?.unlockNPC(nd.name);

    // Story flag
    if (nd.name === 'Elder Lyra') {
      this._gameScene?.storySystem?.flagSet('talked_to_lyra');

      // v0.7 — Show prestige button if unlocked
      const ps = this._gameScene?.prestigeSystem;
      if (ps?.isUnlocked() && ps.canPrestige()) {
        setTimeout(() => this._showPrestigePanel(ps), 600);
      }
    }

    this._dlgInput.value = '';
    this._dlgInput.focus();
  }

  _closeDialogue() {
    this._dlgPanel.classList.remove('open');
    this._dialogueNPC = null;
  }

  async _sendDialogue() {
    if (!this._dialogueNPC) return;
    const msg = this._dlgInput.value.trim();
    if (!msg) return;
    this._dlgInput.value = '';

    this._dlgText.style.opacity    = '0.4';
    this._dlgTyping.style.display  = 'block';

    const currentEvent = this._worldEvents?.getCurrent()?.name || null;
    try {
      const reply = await this._dialogueNPC.talk(msg, this._player?.stats, currentEvent, this._worldCtx);
      this._dlgTyping.style.display = 'none';
      this._dlgText.style.opacity   = '1';
      this._dlgText.textContent     = reply;
      const col = '#' + (this._dialogueNPC.npcData.color || 0xd4af37).toString(16).padStart(6, '0');
      this.logMsg(this._dialogueNPC.npcData.name + ': ' + reply.slice(0, 55) + '…', col);
    } catch (_) {
      this._dlgTyping.style.display = 'none';
      this._dlgText.style.opacity   = '1';
    }
  }

  // ── Trade / shop panel ────────────────────────────────────────────────────────

  _openTrade(npc) {
    this._tradeNPC = npc;
    this._closeDialogue();

    // Reuse/build trade overlay lazily
    let tradeOverlay = document.getElementById('hud-trade');
    if (!tradeOverlay) {
      tradeOverlay = this._el('div', 'hud-fullscreen', document.body);
      tradeOverlay.id = 'hud-trade';
      tradeOverlay.style.display = 'none';
      const closeBtn = this._el('button', 'fs-close', tradeOverlay);
      closeBtn.textContent = '✕';
      closeBtn.onclick = () => { this.tradeOpen = false; tradeOverlay.style.display = 'none'; };
      const t = this._el('div', 'fs-title', tradeOverlay);
      t.id = 'trade-title';
      this._tradeContent = this._el('div', '', tradeOverlay);
    }
    document.getElementById('trade-title').textContent = '// SHOP — ' + npc.npcData.name.toUpperCase();

    this._renderTrade(npc);
    tradeOverlay.style.display = 'flex';
    this.tradeOpen = true;
  }

  _renderTrade(npc) {
    if (!this._tradeContent || !this._tradeSystem || !this._player) return;
    this._tradeContent.innerHTML = '';
    const shop = this._tradeSystem.getShop(npc.npcData.role);

    // v0.4 — show economy / faction status
    const econMsg = this._tradeSystem.getEconomyMessage?.();
    if (econMsg) {
      const msg = document.createElement('div');
      msg.style.cssText = 'color:#ffdd88;font-size:11px;margin-bottom:8px;text-align:center;';
      msg.textContent = '⚡ ' + econMsg;
      this._tradeContent.appendChild(msg);
    }
    if (this.factionSystem) {
      const mult = this._tradeSystem.priceMultiplier?.(npc.npcData.role) ?? 1;
      if (mult !== 1) {
        const rep = document.createElement('div');
        const cheaper = mult < 1;
        rep.style.cssText = `color:${cheaper ? '#44ff88' : '#ff8844'};font-size:10px;margin-bottom:6px;text-align:center;`;
        rep.textContent = cheaper
          ? `★ Faction discount: ${Math.round((1 - mult) * 100)}% off`
          : `⚠ Faction surcharge: +${Math.round((mult - 1) * 100)}%`;
        this._tradeContent.appendChild(rep);
      }
    }

    // Use getAvailableStock if available (v0.4), else fallback
    const items = this._tradeSystem.getAvailableStock?.(npc.npcData.role) ?? shop.items ?? [];

    if (!items.length) {
      const msg = this._el('div', '', this._tradeContent);
      msg.style.cssText = 'color:#555566;font-size:11px;';
      msg.textContent = 'Nothing for sale.';
      return;
    }

    // Buy section
    const buyTitle = this._el('div', 'trade-title', this._tradeContent);
    buyTitle.textContent = 'BUY';
    [...new Set(items)].forEach(key => {
      const info  = CONFIG.ITEMS[key];
      if (!info) return;
      const price = this._tradeSystem.buyPrice(key, npc.npcData.role);
      const row   = this._el('div', 'trade-row', this._tradeContent);
      const nm    = this._el('div', 'trade-item-name', row);
      nm.innerHTML = itemIcon(key) + ' ' + info.name;
      const pr    = this._el('div', 'trade-price', row);
      pr.textContent = price + 'g';
      const btn   = this._el('button', 'trade-btn', row);
      btn.textContent = 'Buy';
      btn.onclick = () => {
        const res = this._tradeSystem.buy(this._player, key, npc.npcData.role);
        this.logMsg(res.msg, res.ok ? '#88ff88' : '#ff6666');
        if (res.ok) this.eventBus?.emit('statsChanged', this._player.stats);
      };
    });

    // Sell section
    const sellTitle = this._el('div', 'trade-title', this._tradeContent);
    sellTitle.style.marginTop = '16px';
    sellTitle.textContent = 'SELL';
    const inv = Object.entries(this._player.inventory || {}).filter(([, qty]) => qty > 0);
    if (inv.length === 0) {
      const empty = this._el('div', '', this._tradeContent);
      empty.style.cssText = 'color:#444455;font-size:11px;';
      empty.textContent = 'Nothing to sell.';
    }
    inv.forEach(([key, qty]) => {
      const info  = CONFIG.ITEMS[key];
      if (!info) return;
      const price = this._tradeSystem.sellPrice(key);
      const row   = this._el('div', 'trade-row', this._tradeContent);
      const nm    = this._el('div', 'trade-item-name', row);
      nm.innerHTML = itemIcon(key) + ' ' + info.name + (qty > 1 ? ` ×${qty}` : '');
      const pr    = this._el('div', 'trade-price', row);
      pr.textContent = price + 'g';
      const btn   = this._el('button', 'trade-btn', row);
      btn.textContent = 'Sell';
      btn.onclick = () => {
        const res = this._tradeSystem.sell(this._player, key);
        this.logMsg(res.msg, res.ok ? '#88ff88' : '#ff6666');
        if (res.ok) { this.eventBus?.emit('statsChanged', this._player.stats); this._renderTrade(npc); }
      };
    });
  }

  // ── World map ────────────────────────────────────────────────────────────────

  _buildWorldMap() {
    const overlay = this._el('div', 'hud-fullscreen', document.body);
    overlay.id = 'hud-map';
    overlay.style.display = 'none';

    const closeBtn = this._el('button', 'fs-close', overlay);
    closeBtn.textContent = '✕';
    closeBtn.onclick = () => this.toggleMap();

    const title = this._el('div', 'fs-title', overlay);
    title.textContent = '// WORLD MAP — AETHORIA';

    this._mapCanvas = this._el('canvas', '', overlay);
    this._mapCanvas.id = 'world-map-canvas';
    this._mapCanvas.width  = 512;
    this._mapCanvas.height = 512;

    this._mapOverlay = overlay;
  }

  toggleMap() {
    this.mapOpen = !this.mapOpen;
    this._mapOverlay.style.display = this.mapOpen ? 'flex' : 'none';
    if (this.mapOpen && this._mapData) this._drawWorldMap();
  }

  _drawWorldMap() {
    if (!this._mapData) return;
    const data = this._mapData;
    const rows = data.length, cols = data[0].length;
    const S    = 512;
    const sw   = S / cols, sh = S / rows;
    const ctx  = this._mapCanvas.getContext('2d');
    const T    = CONFIG.TILES;
    const CM   = {
      [T.DEEP_WATER]:'#0d2137', [T.WATER]:'#1a4a80', [T.SAND]:'#c8a848',
      [T.GRASS]:'#2d6a30', [T.FOREST]:'#1a4520', [T.STONE]:'#5a5a5a',
      [T.DUNGEON_FLOOR]:'#3a4550', [T.DUNGEON_WALL]:'#141414',
      [T.PATH]:'#7a5a3a', [T.TOWN_FLOOR]:'#8a9a8a',
    };
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = CM[data[r][c]] || '#222233';
        ctx.fillRect(c * sw, r * sh, Math.max(1, sw), Math.max(1, sh));
      }
    }
    if (this._player) {
      const px = this._player.position.x / cols * S;
      const pz = this._player.position.z / rows * S;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, pz, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (this._gameScene?._portalPos) {
      const pp = this._gameScene._portalPos;
      const ppx = pp.x / cols * S;
      const ppz = pp.z / rows * S;
      ctx.fillStyle = '#8800ff';
      ctx.beginPath();
      ctx.arc(ppx, ppz, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Skill tree ────────────────────────────────────────────────────────────────

  _buildSkillTree() {
    const overlay = document.createElement('div');
    overlay.id = 'hud-skills';
    overlay.style.cssText = `
      display:none; position:fixed; inset:0;
      background:rgba(4,4,12,0.97); z-index:7800;
      flex-direction:column; font-family:'Courier New',monospace;
      overflow:hidden;
    `;
    document.body.appendChild(overlay);
    this._skillOverlay = overlay;

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid #223;flex-shrink:0;';
    overlay.appendChild(header);

    this._skillTitle = document.createElement('div');
    this._skillTitle.style.cssText = 'color:#d4af37;font-size:15px;letter-spacing:2px;';
    this._skillTitle.textContent = '// SKILL TREE';
    header.appendChild(this._skillTitle);

    this._skillPointsEl = document.createElement('div');
    this._skillPointsEl.style.cssText = 'color:#aaddff;font-size:12px;';
    header.appendChild(this._skillPointsEl);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ (K)';
    closeBtn.style.cssText = 'background:none;border:1px solid #334;color:#aaa;border-radius:3px;padding:3px 10px;cursor:pointer;font-family:inherit;font-size:11px;';
    closeBtn.onclick = () => this.toggleSkillTree();
    header.appendChild(closeBtn);

    // Tier labels + scroll body
    const body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow-y:auto;padding:16px 20px;';
    overlay.appendChild(body);
    this._skillBody = body;
  }

  toggleSkillTree(player) {
    if (player) this._player = player;
    this.skillOpen = !this.skillOpen;
    this._skillOverlay.style.display = this.skillOpen ? 'flex' : 'none';
    if (this.skillOpen) this._renderSkills();
  }

  _renderSkills() {
    if (!this._player || !this._skillBody) return;
    this._skillBody.innerHTML = '';

    const p          = this._player;
    const cls        = p.playerClass ?? 'WARRIOR';
    const classSkills= CONFIG.CLASSES[cls]?.skills ?? [];
    const sp         = p.stats?.skillPoints ?? 0;
    const clsColors  = { WARRIOR:'#ff6633', MAGE:'#cc44ff', RANGER:'#44cc88' };
    const clsColor   = clsColors[cls] ?? '#d4af37';

    // Update header
    if (this._skillTitle) this._skillTitle.textContent = `// ${cls} SKILL TREE`;
    if (this._skillPointsEl) {
      this._skillPointsEl.innerHTML =
        `<span style="color:#667;">Skill Points: </span>` +
        `<span style="color:#aaddff;font-weight:bold;">${sp}</span>`;
    }

    // Helper: check if prereqs are met
    const prereqsMet = (key) => {
      const sk = CONFIG.SKILLS[key];
      if (!sk?.requires?.length) return true;
      return sk.requires.every(req => {
        const [rKey, rRank] = req.split(':');
        return (p.skills?.[rKey] ?? 0) >= parseInt(rRank ?? 1);
      });
    };

    const canAfford = (key) => {
      const rank = (p.skills?.[key] ?? 0) + 1;
      const cost = CONFIG.SKILL_POINT_COST?.[rank] ?? rank;
      return sp >= cost;
    };

    // Render skills by tier
    for (const tier of [1, 2, 3]) {
      const tierNames = { 1:'FOUNDATION', 2:'ADVANCED', 3:'MASTERY' };
      const tierColors= { 1:'#667788', 2:'#8899aa', 3:clsColor };

      // Tier separator
      const sep = document.createElement('div');
      sep.style.cssText = `
        display:flex; align-items:center; gap:12px; margin:${tier===1?'0':'24px'} 0 14px;
      `;
      const line1 = document.createElement('div');
      line1.style.cssText = 'flex:1;height:1px;background:#223;';
      const tierLabel = document.createElement('div');
      tierLabel.style.cssText = `font-size:9px;color:${tierColors[tier]};letter-spacing:3px;white-space:nowrap;`;
      tierLabel.textContent = `TIER ${tier} — ${tierNames[tier]}`;
      const line2 = document.createElement('div');
      line2.style.cssText = 'flex:1;height:1px;background:#223;';
      sep.appendChild(line1); sep.appendChild(tierLabel); sep.appendChild(line2);
      this._skillBody.appendChild(sep);

      // Skills grid for this tier
      const grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;';
      this._skillBody.appendChild(grid);

      const tierSkills = classSkills
        .filter(key => CONFIG.SKILLS[key]?.tier === tier);

      if (!tierSkills.length) {
        const none = document.createElement('div');
        none.style.cssText = 'color:#334;font-size:10px;padding:8px 0;';
        none.textContent = '— locked —';
        grid.appendChild(none);
        continue;
      }

      tierSkills.forEach(key => {
        const sk      = CONFIG.SKILLS[key];
        if (!sk) return;
        const curRank = p.skills?.[key] ?? 0;
        const maxed   = curRank >= sk.maxRank;
        const met     = prereqsMet(key);
        const afford  = canAfford(key);
        const nextCost= CONFIG.SKILL_POINT_COST?.[curRank + 1] ?? (curRank + 1);

        // Card
        const card = document.createElement('div');
        const locked = !met;
        card.style.cssText = `
          background:${locked ? 'rgba(10,10,20,0.5)' : 'rgba(14,14,28,0.9)'};
          border:1px solid ${maxed ? clsColor : met ? '#334' : '#1a1a2a'};
          border-radius:6px; padding:12px 14px;
          opacity:${locked ? '0.5' : '1'};
          transition:border-color 0.2s;
          position:relative; overflow:hidden;
        `;

        // Maxed shimmer
        if (maxed) {
          card.style.boxShadow = `0 0 12px ${clsColor}44`;
        }

        // Icon + name row
        const nameRow = document.createElement('div');
        nameRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;';
        nameRow.innerHTML = `
          <span style="font-size:18px;">${sk.icon ?? '?'}</span>
          <span style="color:${maxed ? clsColor : met ? '#ccc' : '#556'};font-size:12px;font-weight:bold;">${sk.name}</span>
          ${maxed ? `<span style="font-size:9px;color:${clsColor};margin-left:auto;">MAX</span>` : ''}
        `;
        card.appendChild(nameRow);

        // Description
        const desc = document.createElement('div');
        desc.style.cssText = 'font-size:10px;color:#889;line-height:1.5;margin-bottom:8px;';
        desc.textContent = sk.desc;
        card.appendChild(desc);

        // Rank pips
        const pipsRow = document.createElement('div');
        pipsRow.style.cssText = 'display:flex;gap:4px;margin-bottom:8px;align-items:center;';
        for (let r = 0; r < sk.maxRank; r++) {
          const pip = document.createElement('div');
          const filled = r < curRank;
          pip.style.cssText = `
            width:${Math.min(24, Math.floor(160/sk.maxRank))}px; height:6px;
            border-radius:2px; flex:1; max-width:28px;
            background:${filled ? clsColor : '#223'};
            border:1px solid ${filled ? clsColor : '#334'};
            transition:background 0.2s;
          `;
          pipsRow.appendChild(pip);
        }
        const rankText = document.createElement('span');
        rankText.style.cssText = 'font-size:9px;color:#556;margin-left:6px;';
        rankText.textContent = `${curRank}/${sk.maxRank}`;
        pipsRow.appendChild(rankText);
        card.appendChild(pipsRow);

        // Prerequisites display
        if (sk.requires?.length) {
          const reqDiv = document.createElement('div');
          reqDiv.style.cssText = 'font-size:9px;color:#445;margin-bottom:7px;';
          reqDiv.textContent = 'Requires: ' + sk.requires.map(r => {
            const [rk, rr] = r.split(':');
            const have = p.skills?.[rk] ?? 0;
            const need = parseInt(rr ?? 1);
            const done = have >= need;
            return `<span style="color:${done ? '#44aa44' : '#aa4444'}">${CONFIG.SKILLS[rk]?.name ?? rk} ${rr ? 'Rank '+rr : ''}</span>`;
          }).join(', ');
          reqDiv.innerHTML = 'Requires: ' + sk.requires.map(r => {
            const [rk, rr] = r.split(':');
            const have = p.skills?.[rk] ?? 0;
            const need = parseInt(rr ?? 1);
            const done = have >= need;
            return `<span style="color:${done?'#44cc44':'#cc4444'}">${CONFIG.SKILLS[rk]?.name??rk}${rr?' Rk'+rr:''}</span>`;
          }).join(' · ');
          card.appendChild(reqDiv);
        }

        // Learn button
        if (!maxed) {
          const btn = document.createElement('button');
          const canLearn = met && afford && !maxed;
          btn.style.cssText = `
            width:100%; padding:6px; border-radius:4px; cursor:${canLearn?'pointer':'not-allowed'};
            font-family:'Courier New',monospace; font-size:10px; letter-spacing:1px;
            background:${canLearn ? clsColor+'22' : 'transparent'};
            border:1px solid ${canLearn ? clsColor : '#334'};
            color:${canLearn ? clsColor : '#445'};
            transition:all 0.15s;
          `;
          if (!met) btn.textContent = '🔒 Locked';
          else if (!afford) btn.textContent = `⚠ Need ${nextCost} SP (have ${sp})`;
          else btn.textContent = `▲ Rank ${curRank+1}  [${nextCost} SP]`;

          btn.onclick = () => {
            if (!canLearn) return;
            if (p.learnSkill(key)) {
              this._renderSkills();
              this.logMsg(`✓ ${sk.name} → Rank ${(p.skills?.[key]??0)}`, clsColor);
            }
          };
          card.appendChild(btn);
        }

        grid.appendChild(card);
      });
    }

    // Unspent SP warning
    if (sp > 0) {
      const warn = document.createElement('div');
      warn.style.cssText = 'text-align:center;padding:16px;color:#aaddff;font-size:11px;margin-top:8px;';
      warn.textContent = `You have ${sp} unspent skill point${sp!==1?'s':''}!`;
      this._skillBody.appendChild(warn);
    }
  }

  // ── Act banner ────────────────────────────────────────────────────────────────

  _buildActBanner() {
    const banner = this._el('div', '', document.body);
    banner.id = 'hud-act-banner';
    this._actBanner = banner;
  }

  /**
   * @param {{ name:string, title:string, desc:string }} act
   */
  showActBanner(act) {
    if (!act || !this._actBanner) return;
    this._actBanner.innerHTML = `
      <div class="act-tag">${act.name?.toUpperCase() || 'PROLOGUE'}</div>
      <div class="act-title">${act.title || ''}</div>
      <div class="act-sub">${act.desc || ''}</div>
    `;
    this._actBanner.classList.add('show');
    clearTimeout(this._actBannerTimer);
    this._actBannerTimer = setTimeout(() => {
      this._actBanner.classList.remove('show');
    }, 5000);
  }

  // ── Achievement popup ─────────────────────────────────────────────────────────

  _buildAchievementPopup() {
    const el = document.createElement('div');
    el.id = 'hud-achievement';
    el.style.cssText = `
      position:fixed; top:-110px; right:16px;
      background:rgba(6,6,18,0.97); border:1px solid #334;
      border-radius:6px; padding:12px 16px; z-index:9500;
      font-family:'Courier New',monospace; min-width:260px; max-width:320px;
      transition:top 0.4s cubic-bezier(0.34,1.56,0.64,1);
      box-shadow:0 4px 20px rgba(0,0,0,0.8);
    `;
    document.body.appendChild(el);
    this._achEl = el;
  }

  showAchievement(ach) {
    if (!ach || !this._achEl) return;
    const { ACH_RARITY } = window._achRarity ?? {};
    const rarDef = (ach.rarity && ACH_RARITY) ? ACH_RARITY[ach.rarity] : null;
    const col    = rarDef?.color ?? '#d4af37';
    const glow   = rarDef?.glow  ?? 'rgba(212,175,55,0.3)';
    const rarLbl = rarDef?.label ?? '';
    const rewardHtml = ach.reward
      ? `<div style="font-size:9px;color:#44cc88;margin-top:4px;">🎁 ${ach.reward.label ?? ach.reward.type}</div>`
      : '';

    this._achEl.style.borderColor = col;
    this._achEl.style.boxShadow   = `0 4px 20px rgba(0,0,0,0.8), 0 0 16px ${glow}`;
    this._achEl.innerHTML = `
      <div style="font-size:9px;color:#556;letter-spacing:2px;margin-bottom:4px;">✦ ACHIEVEMENT UNLOCKED</div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
        <span style="font-size:24px;">${ach.icon ?? '🏆'}</span>
        <div>
          <div style="color:${col};font-size:13px;font-weight:bold;">${ach.name}</div>
          <div style="font-size:9px;color:${col};opacity:0.7;">${rarLbl}</div>
        </div>
      </div>
      <div style="font-size:10px;color:#889;line-height:1.4;">${ach.desc}</div>
      ${rewardHtml}
    `;

    this._achEl.style.top = '16px';
    clearTimeout(this._achTimer);
    this._achTimer = setTimeout(() => {
      this._achEl.style.top = '-110px';
    }, 5000);
    this.logMsg(`✦ ${ach.name}`, col);
  }

  // ── World event banner ────────────────────────────────────────────────────────

  _buildEventBanner() {
    const el = document.createElement('div');
    el.id = 'hud-event-banner';
    el.innerHTML = `
      <div class="ev-name" id="ev-name">—</div>
      <div class="ev-desc" id="ev-desc">—</div>
    `;
    document.body.appendChild(el);
    this._evBanner = el;
  }

  showWorldEvent(ev) {
    if (!ev || !this._evBanner) return;
    const col = '#' + (ev.color || 0x8844ff).toString(16).padStart(6, '0');
    document.getElementById('ev-name').textContent = '** ' + ev.name.toUpperCase() + ' **';
    document.getElementById('ev-name').style.color = col;
    document.getElementById('ev-desc').textContent  = ev.desc;
    this._evBanner.style.borderColor = col;
    this._evBanner.classList.add('show');
    this.logMsg(ev.name + ': ' + ev.desc, '#cc88ff');
    clearTimeout(this._evBannerTimer);
    this._evBannerTimer = setTimeout(() => {
      this._evBanner.classList.remove('show');
    }, 6000);
  }

  // ── Controls hint ─────────────────────────────────────────────────────────────

  _buildHint() {
    const el = document.createElement('div');
    el.id = 'hud-hint';
    const isTouchDevice = (navigator.maxTouchPoints > 0) || ('ontouchstart' in window);
    el.textContent = isTouchDevice
      ? 'Left-drag: Move  |  Right-drag: Rotate Camera  |  Tap: Attack/Loot  |  ⚔ Attack  |  💬 Talk (E)  |  📦 Inventory'
      : 'WASD/Arrows: Move  |  Q/E: Rotate  |  Left-click: Attack/Loot  |  E: Talk  |  I: Inv  |  M: Map  |  Q: Quests  |  K: Skills  |  1-4: Abilities  |  F/N/C/P: Panels';
    document.body.appendChild(el);
  }


  // ── v0.4: Factions Panel ──────────────────────────────────────────────────────

  _buildFactions() {
    const panel = document.createElement('div');
    panel.id = 'hud-factions';
    panel.style.cssText = `
      display:none; position:fixed; top:50%; left:50%;
      transform:translate(-50%,-50%);
      background:rgba(8,8,18,0.97); border:1px solid #334;
      border-radius:6px; padding:20px 24px; z-index:8000;
      min-width:380px; max-width:480px; color:#ccc;
      font-family:'Courier New',monospace;
      box-shadow:0 0 30px rgba(0,0,0,0.8);
    `;
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <span style="color:#aaddff;font-size:15px;letter-spacing:2px;">// FACTIONS</span>
        <button id="hud-factions-close" style="background:none;border:1px solid #445;color:#aaa;
          border-radius:3px;padding:2px 8px;cursor:pointer;font-family:inherit;">✕</button>
      </div>
      <div id="hud-factions-body"></div>
      <div style="margin-top:14px;font-size:9px;color:#556;border-top:1px solid #223;padding-top:8px;">
        Reputation affects prices, quest rewards, and NPC behaviour.
      </div>
    `;
    document.body.appendChild(panel);
    this._factionPanel = panel;
    this._factionBody  = panel.querySelector('#hud-factions-body');

    panel.querySelector('#hud-factions-close').onclick = () => this.toggleFactions();
  }

  toggleFactions() {
    this.factionOpen = !this.factionOpen;
    if (!this._factionPanel) return;
    this._factionPanel.style.display = this.factionOpen ? 'block' : 'none';
    if (this.factionOpen) this.refreshFactions();
  }

  refreshFactions() {
    if (!this._factionBody) return;
    const summary = this.factionSystem?.getSummary?.();
    if (!summary) {
      this._factionBody.innerHTML = '<div style="color:#556;font-size:11px;">No faction data yet.</div>';
      return;
    }

    this._factionBody.innerHTML = '';
    for (const f of summary) {
      const row = document.createElement('div');
      row.style.cssText = 'margin-bottom:14px;';

      const repPct  = Math.round(((f.rep + 1000) / 2000) * 100);
      const barColor = f.standingData?.color ?? '#aaaaaa';

      row.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px;">
          <span style="color:${f.color};font-size:12px;font-weight:bold;">${f.name}</span>
          <span style="color:${barColor};font-size:10px;">${f.standingData?.label ?? f.standing}</span>
        </div>
        <div style="background:#111;border-radius:2px;height:6px;position:relative;overflow:hidden;margin-bottom:5px;">
          <div style="height:100%;width:${repPct}%;background:${barColor};border-radius:2px;
            transition:width 0.4s;"></div>
          <div style="position:absolute;left:50%;top:0;height:100%;width:1px;background:#334;"></div>
        </div>
        <div style="font-size:9px;color:#667;margin-bottom:4px;">${f.rep > 0 ? '+' : ''}${f.rep} / 1000</div>
        ${f.unlocks.length ? `
          <div style="font-size:9px;color:#88aaff;">
            ${f.unlocks.map(u => `✓ <span title="${u.desc}">${u.label}</span>`).join('  ')}
          </div>
        ` : ''}
      `;
      this._factionBody.appendChild(row);
    }

    // Recent rep log
    const log = this.factionSystem?.getRecentLog?.(5);
    if (log?.length) {
      const logDiv = document.createElement('div');
      logDiv.style.cssText = 'margin-top:10px;font-size:9px;color:#445;border-top:1px solid #223;padding-top:8px;';
      logDiv.innerHTML = '<div style="color:#556;margin-bottom:4px;">Recent changes:</div>' +
        log.map(l => {
          const sign = l.delta > 0 ? '+' : '';
          const col  = l.delta > 0 ? '#44ff88' : '#ff6644';
          return `<div><span style="color:${col}">${sign}${l.delta}</span> ${l.factionId} — ${l.reason}</div>`;
        }).join('');
      this._factionBody.appendChild(logDiv);
    }
  }


  // ── v0.5: Enchanting Panel ────────────────────────────────────────────────────

  _buildEnchant() {
    const panel = document.createElement('div');
    panel.id = 'hud-enchant';
    panel.style.cssText = `
      display:none; position:fixed; top:50%; left:50%;
      transform:translate(-50%,-50%);
      background:rgba(8,8,20,0.97); border:1px solid #503;
      border-radius:6px; padding:20px 24px; z-index:8000;
      min-width:400px; max-width:500px; color:#ccc;
      font-family:'Courier New',monospace;
      box-shadow:0 0 30px rgba(80,0,150,0.5);
    `;
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <span style="color:#cc88ff;font-size:15px;letter-spacing:2px;">// ENCHANTING FORGE</span>
        <button id="hud-enchant-close" style="background:none;border:1px solid #503;color:#aaa;
          border-radius:3px;padding:2px 8px;cursor:pointer;font-family:inherit;">✕</button>
      </div>
      <div style="font-size:10px;color:#664;margin-bottom:12px;">
        Enchant weapons and armour with Void Crystals and rare materials.
        Max 2 enchantments per item. Upgrade existing enchantments up to +5.
      </div>
      <div id="hud-enchant-body"></div>
    `;
    document.body.appendChild(panel);
    this._enchantPanel = panel;
    this._enchantBody  = panel.querySelector('#hud-enchant-body');
    panel.querySelector('#hud-enchant-close').onclick = () => this.toggleEnchant();
  }

  toggleEnchant() {
    this.enchantOpen = !this.enchantOpen;
    if (!this._enchantPanel) return;
    this._enchantPanel.style.display = this.enchantOpen ? 'block' : 'none';
    if (this.enchantOpen) this._renderEnchant();
  }

  _renderEnchant() {
    if (!this._enchantBody) return;
    this._enchantBody.innerHTML = '';
    const player  = this._player;
    const enchSys = this._enchantSystem;
    if (!player || !enchSys) {
      this._enchantBody.innerHTML = '<div style="color:#556;font-size:11px;">No player data.</div>';
      return;
    }

    // List equippable items
    const enchantable = ['sword','axe','staff','bow','club','shield','chainmail','leather','robes']
      .filter(key => (player.inventory?.[key] ?? 0) > 0 ||
                     player.equipment?.weapon === key ||
                     player.equipment?.armor  === key);

    if (!enchantable.length) {
      this._enchantBody.innerHTML = '<div style="color:#556;font-size:11px;">No enchantable items in inventory. Equip or carry a weapon or armour.</div>';
      return;
    }

    for (const itemKey of enchantable) {
      const itemDef   = CONFIG.ITEMS[itemKey];
      if (!itemDef) continue;
      const enchants  = enchSys.getEnchants(player, itemKey);
      const available = enchSys.getAffordableEnchants(player, itemKey);

      const block = document.createElement('div');
      block.style.cssText = 'margin-bottom:16px;border:1px solid #303;border-radius:4px;padding:10px 12px;';

      // Item header
      const header = document.createElement('div');
      header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';
      header.innerHTML = `
        <span style="color:#ddccff;font-size:12px;">${itemIcon(itemKey)} ${itemDef.name}</span>
        <span style="font-size:9px;color:#556;">${enchants.length}/2 enchants</span>
      `;
      block.appendChild(header);

      // Current enchants
      if (enchants.length) {
        for (const enc of enchants) {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;font-size:10px;';
          row.innerHTML = `
            <span style="color:${enc.color};">${enc.name} +${enc.level}</span>
            <span style="color:#667;">${enc.desc}</span>
          `;
          // Upgrade button
          const upBtn = document.createElement('button');
          upBtn.textContent = '⬆ +' + (enc.level + 1);
          upBtn.style.cssText = 'background:none;border:1px solid #503;color:#aa88cc;font-family:inherit;font-size:9px;padding:2px 6px;cursor:pointer;border-radius:2px;margin-left:6px;';
          upBtn.onclick = () => {
            const res = enchSys.upgrade(player, itemKey);
            this.logMsg(res.msg, res.ok ? '#cc88ff' : '#ff6666');
            if (res.ok) this._renderEnchant();
          };
          row.appendChild(upBtn);
          block.appendChild(row);
        }
      } else {
        const none = document.createElement('div');
        none.style.cssText = 'font-size:9px;color:#445;margin-bottom:6px;';
        none.textContent = 'No enchantments yet.';
        block.appendChild(none);
      }

      // Available enchantments to add
      if (enchants.length < 2 && available.length) {
        const title = document.createElement('div');
        title.style.cssText = 'font-size:9px;color:#775;margin:6px 0 4px;';
        title.textContent = 'AVAILABLE ENCHANTMENTS:';
        block.appendChild(title);

        for (const enc of available.slice(0, 4)) {
          const row = document.createElement('div');
          row.style.cssText = `display:flex;justify-content:space-between;align-items:center;
            margin-bottom:4px;opacity:${enc.canAfford ? '1' : '0.4'};`;
          row.innerHTML = `
            <span style="font-size:10px;color:${enc.color};">${enc.name}</span>
            <span style="font-size:9px;color:#556;flex:1;margin:0 8px;">${enc.desc}</span>
            <span style="font-size:9px;color:#664;">${enc.costDisplay}</span>
          `;
          if (enc.canAfford) {
            const btn = document.createElement('button');
            btn.textContent = '✨ Enchant';
            btn.style.cssText = 'background:none;border:1px solid #503;color:#cc88ff;font-family:inherit;font-size:9px;padding:2px 6px;cursor:pointer;border-radius:2px;margin-left:6px;';
            btn.onclick = () => {
              const res = enchSys.enchant(player, itemKey);
              this.logMsg(res.msg, res.ok ? '#cc88ff' : '#ff6666');
              if (res.ok) this._renderEnchant();
            };
            row.appendChild(btn);
          }
          block.appendChild(row);
        }
      }

      this._enchantBody.appendChild(block);
    }
  }



  // ── v0.6: Ability Hotbar ──────────────────────────────────────────────────

  _buildAbilityBar() {
    const bar = document.createElement('div');
    bar.id = 'hud-ability-bar';
    bar.style.cssText = `
      position:fixed; bottom:18px; left:50%; transform:translateX(-50%);
      display:flex; gap:6px; z-index:4000; pointer-events:none;
    `;
    document.body.appendChild(bar);
    this._abilityBar = bar;
    this._abilitySlots = [];

    for (let i = 0; i < 4; i++) {
      const slot = document.createElement('div');
      slot.style.cssText = `
        width:58px; height:58px; position:relative;
        background:rgba(8,8,18,0.88); border:1px solid #334;
        border-radius:6px; display:flex; flex-direction:column;
        align-items:center; justify-content:center;
        font-family:'Courier New',monospace; pointer-events:none;
        box-shadow: inset 0 0 8px rgba(0,0,0,0.6);
      `;

      // Key number badge
      const badge = document.createElement('div');
      badge.style.cssText = `position:absolute;top:3px;left:5px;font-size:9px;color:#556;`;
      badge.textContent = i + 1;
      slot.appendChild(badge);

      // Icon
      const icon = document.createElement('div');
      icon.style.cssText = 'font-size:20px; line-height:1; margin-bottom:1px;';
      icon.textContent = '—';
      slot.appendChild(icon);

      // Name
      const name = document.createElement('div');
      name.style.cssText = 'font-size:7px;color:#667;text-align:center;padding:0 2px;';
      name.textContent = '';
      slot.appendChild(name);

      // Cooldown overlay
      const cdOverlay = document.createElement('div');
      cdOverlay.style.cssText = `
        position:absolute; inset:0; background:rgba(0,0,0,0.65);
        border-radius:5px; display:none; align-items:center; justify-content:center;
        font-size:12px; font-weight:bold; color:#fff; font-family:'Courier New',monospace;
      `;
      slot.appendChild(cdOverlay);

      // Mana cost badge
      const manaBadge = document.createElement('div');
      manaBadge.style.cssText = `position:absolute;bottom:3px;right:4px;font-size:7px;color:#4488ff;`;
      slot.appendChild(manaBadge);

      bar.appendChild(slot);
      this._abilitySlots.push({ slot, icon, name, cdOverlay, badge, manaBadge });
    }
  }

  refreshAbilityBar(slots) {
    if (!slots) return;

    // Update mobile ability buttons
    if (this._mobileAbilityBtns) {
      slots.forEach((data, i) => {
        const btn = this._mobileAbilityBtns[i];
        if (!btn) return;
        if (btn._iconEl) btn._iconEl.textContent = data.icon ?? '?';
        if (btn._nameEl) btn._nameEl.textContent = data.name?.slice(0,8) ?? '';
        btn.style.borderColor = data.ready ? (data.color ?? '#334') : '#334';
        btn.style.color = data.color ?? '#aaa';
        btn.style.boxShadow = data.ready && data.color
          ? `0 0 8px ${data.color}55, inset 0 1px 0 rgba(255,255,255,0.05)`
          : 'inset 0 1px 0 rgba(255,255,255,0.05)';
        const cd = btn._cdOverlay;
        if (cd) {
          cd.style.display = !data.ready && data.cdLeft > 0 ? 'flex' : 'none';
          cd.textContent = data.cdLeft > 0 ? data.cdLeft.toFixed(0) + 's' : '';
        }
      });
    }

    if (!this._abilitySlots) return;
    slots.forEach((data, i) => {
      const s = this._abilitySlots[i];
      if (!s) return;

      s.icon.textContent = data.icon ?? '?';
      s.icon.style.color = data.color ?? '#aaa';
      s.name.textContent = data.name ?? '';
      s.manaBadge.textContent = data.manaCost ? data.manaCost + 'mp' : '';

      const ready = data.ready;
      s.slot.style.borderColor = ready ? (data.color ?? '#334') : '#223';
      s.slot.style.opacity     = ready ? '1' : '0.7';

      if (!ready && data.cdLeft > 0) {
        s.cdOverlay.style.display = 'flex';
        s.cdOverlay.textContent   = data.cdLeft.toFixed(1) + 's';
      } else {
        s.cdOverlay.style.display = 'none';
      }

      // Glow when ready
      if (ready && data.color) {
        s.slot.style.boxShadow = `inset 0 0 8px rgba(0,0,0,0.6), 0 0 6px ${data.color}44`;
      } else {
        s.slot.style.boxShadow = 'inset 0 0 8px rgba(0,0,0,0.6)';
      }
    });
  }


  // ── v0.7: Achievement Gallery (A key) ─────────────────────────────────────

  _buildAchievementGallery() {
    const panel = document.createElement('div');
    panel.id = 'hud-ach-gallery';
    panel.style.cssText = `
      display:none; position:fixed; top:50%; left:50%;
      transform:translate(-50%,-50%);
      background:rgba(6,8,18,0.97); border:1px solid #334;
      border-radius:6px; padding:0; z-index:8100;
      width:580px; max-height:82vh;
      font-family:'Courier New',monospace; overflow:hidden;
      flex-direction:column; box-shadow:0 0 40px rgba(0,0,0,0.9);
    `;
    document.body.appendChild(panel);
    this._achGallery = panel;

    // Header
    const hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:14px 20px 10px;border-bottom:1px solid #223;flex-shrink:0;';
    this._achHeaderEl = document.createElement('span');
    this._achHeaderEl.style.cssText = 'color:#d4af37;font-size:15px;letter-spacing:2px;';
    this._achHeaderEl.textContent = '// ACHIEVEMENTS';
    hdr.appendChild(this._achHeaderEl);
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'background:none;border:1px solid #334;color:#aaa;border-radius:3px;padding:2px 8px;cursor:pointer;font-family:inherit;';
    closeBtn.onclick = () => this.toggleAchievements();
    hdr.appendChild(closeBtn);
    panel.appendChild(hdr);

    // Filter tabs
    const tabs = document.createElement('div');
    tabs.style.cssText = 'display:flex;border-bottom:1px solid #223;flex-shrink:0;overflow-x:auto;';
    panel.appendChild(tabs);
    this._achTabs = tabs;
    this._achCatFilter = 'All';

    // Body
    const body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow-y:auto;padding:14px 20px;';
    panel.appendChild(body);
    this._achBody = body;
  }

  toggleAchievements() {
    this.achOpen = !this.achOpen;
    if (!this._achGallery) return;
    this._achGallery.style.display = this.achOpen ? 'flex' : 'none';
    if (this.achOpen) this._renderAchievements();
  }

  _renderAchievements() {
    if (!this._achBody) return;
    const achSys = this._gameScene?.achievements;
    const all    = achSys?.getAll() ?? [];
    const unlocked = all.filter(a => a.unlocked).length;
    const total    = all.length;

    // Header count
    if (this._achHeaderEl) {
      this._achHeaderEl.textContent = `// ACHIEVEMENTS  ${unlocked}/${total}`;
    }

    // Category tabs
    if (this._achTabs) {
      this._achTabs.innerHTML = '';
      const cats = ['All', 'Combat', 'Explore', 'Progress', 'Economy', 'Lore', 'Survival'];
      cats.forEach(cat => {
        const btn = document.createElement('button');
        btn.style.cssText = `background:none;border:none;border-bottom:2px solid transparent;
          color:${cat===this._achCatFilter?'#d4af37':'#556'};font-family:inherit;font-size:10px;
          letter-spacing:1px;padding:8px 12px;cursor:pointer;white-space:nowrap;
          border-bottom-color:${cat===this._achCatFilter?'#d4af37':'transparent'};`;
        btn.textContent = cat;
        btn.onclick = () => { this._achCatFilter = cat; this._renderAchievements(); };
        this._achTabs.appendChild(btn);
      });
    }

    // Filter
    const filtered = this._achCatFilter === 'All'
      ? all
      : all.filter(a => a.cat === this._achCatFilter);

    this._achBody.innerHTML = '';

    // Progress bar
    const pct = Math.round(unlocked / total * 100);
    const progDiv = document.createElement('div');
    progDiv.style.cssText = 'margin-bottom:14px;';
    progDiv.innerHTML = `
      <div style="display:flex;justify-content:space-between;font-size:9px;color:#556;margin-bottom:4px;">
        <span>${unlocked} unlocked</span><span>${pct}% complete</span>
      </div>
      <div style="background:#111;border-radius:2px;height:5px;">
        <div style="width:${pct}%;background:#d4af37;height:100%;border-radius:2px;transition:width 0.4s;"></div>
      </div>
    `;
    this._achBody.appendChild(progDiv);

    // Achievement cards
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;';
    this._achBody.appendChild(grid);

    const rarColors = { COMMON:'#aaaaaa',UNCOMMON:'#44ff44',RARE:'#4488ff',EPIC:'#aa44ff',LEGENDARY:'#ffaa00' };

    filtered.forEach(a => {
      const col = rarColors[a.rarity] ?? '#aaa';
      const card = document.createElement('div');
      card.style.cssText = `
        background:rgba(10,10,22,0.8); border:1px solid ${a.unlocked ? col : '#1a1a2a'};
        border-radius:5px; padding:10px 12px; opacity:${a.unlocked ? '1' : '0.45'};
        box-shadow:${a.unlocked ? '0 0 8px '+col+'33' : 'none'};
      `;
      card.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <span style="font-size:18px;${a.unlocked?'':'filter:grayscale(1)'}">${a.icon ?? '🏆'}</span>
          <div>
            <div style="color:${a.unlocked?col:'#445'};font-size:11px;font-weight:bold;">${a.name}</div>
            <div style="font-size:8px;color:${col};opacity:0.6;">${a.rarity}</div>
          </div>
        </div>
        <div style="font-size:9px;color:${a.unlocked?'#889':'#334'};line-height:1.4;">${a.desc}</div>
        ${a.reward && a.unlocked ? `<div style="font-size:8px;color:#44cc88;margin-top:4px;">🎁 ${a.reward.label??''}</div>` : ''}
        ${!a.unlocked ? '<div style="font-size:8px;color:#334;margin-top:3px;">🔒 Locked</div>' : ''}
      `;
      grid.appendChild(card);
    });
  }


  // ── v0.7: Daily / Weekly Challenges (D key) ───────────────────────────────

  _buildDailyChallenges() {
    const panel = document.createElement('div');
    panel.id = 'hud-daily';
    panel.style.cssText = `
      display:none; position:fixed; top:50%; left:50%;
      transform:translate(-50%,-50%);
      background:rgba(6,8,18,0.97); border:1px solid #334;
      border-radius:6px; z-index:8100; width:480px; max-height:80vh;
      font-family:'Courier New',monospace; overflow:hidden;
      flex-direction:column; box-shadow:0 0 40px rgba(0,0,0,0.9);
    `;
    document.body.appendChild(panel);
    this._dailyPanel = panel;

    const hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:14px 20px 10px;border-bottom:1px solid #223;flex-shrink:0;';
    hdr.innerHTML = '<span style="color:#44ff88;font-size:15px;letter-spacing:2px;">// CHALLENGES</span>';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'background:none;border:1px solid #334;color:#aaa;border-radius:3px;padding:2px 8px;cursor:pointer;font-family:inherit;';
    closeBtn.onclick = () => this.toggleDailyChallenges();
    hdr.appendChild(closeBtn);
    panel.appendChild(hdr);

    this._dailyBody = document.createElement('div');
    this._dailyBody.style.cssText = 'flex:1;overflow-y:auto;padding:16px 20px;';
    panel.appendChild(this._dailyBody);
  }

  toggleDailyChallenges() {
    this.dailyOpen = !this.dailyOpen;
    if (!this._dailyPanel) return;
    this._dailyPanel.style.display = this.dailyOpen ? 'flex' : 'none';
    if (this.dailyOpen) this._renderDailyChallenges();
  }

  _renderDailyChallenges() {
    if (!this._dailyBody) return;
    const sys = this._gameScene?.dailyChallengeSystem;
    if (!sys) {
      this._dailyBody.innerHTML = '<div style="color:#445;font-size:11px;">No challenges available.</div>';
      return;
    }

    const daily  = sys.getDaily();
    const weekly = sys.getWeekly();
    const reset  = sys.getTimeUntilReset();

    const renderChallenge = (ch, isWeekly) => {
      const pct    = Math.min(100, Math.round((ch.progress ?? 0) / ch.needed * 100));
      const barCol = ch.done ? '#44ff88' : isWeekly ? '#aa44ff' : '#44aaff';
      const rewardStr = ch.reward
        ? `+${ch.reward.xp ?? 0}XP +${ch.reward.gold ?? 0}g${ch.reward.item ? ' + ' + ch.reward.item : ''}`
        : '';
      const div = document.createElement('div');
      div.style.cssText = `
        background:rgba(10,12,24,0.8); border:1px solid ${ch.done ? '#224422' : '#223'};
        border-radius:5px; padding:10px 12px; margin-bottom:8px;
        opacity:${ch.done ? '0.6' : '1'};
      `;
      div.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
          <span style="font-size:18px;">${ch.icon}</span>
          <div style="flex:1;">
            <div style="color:${ch.done ? '#44ff88' : '#ccc'};font-size:11px;font-weight:bold;">
              ${ch.done ? '✅ ' : ''}${ch.title}
            </div>
            <div style="font-size:9px;color:#556;">${isWeekly ? 'WEEKLY' : 'DAILY'} · Resets in ${reset}</div>
          </div>
          <div style="font-size:10px;color:${barCol};">${ch.progress ?? 0}/${ch.needed}</div>
        </div>
        <div style="font-size:9px;color:#778;margin-bottom:6px;">${ch.desc}</div>
        <div style="background:#111;border-radius:2px;height:5px;margin-bottom:5px;">
          <div style="width:${pct}%;background:${barCol};height:100%;border-radius:2px;transition:width 0.3s;"></div>
        </div>
        ${rewardStr ? `<div style="font-size:9px;color:#44cc88;">🎁 ${rewardStr}</div>` : ''}
      `;
      return div;
    };

    this._dailyBody.innerHTML = '';

    // Daily section
    const dailyHdr = document.createElement('div');
    dailyHdr.style.cssText = 'font-size:9px;color:#44aaff;letter-spacing:2px;margin-bottom:10px;';
    dailyHdr.textContent = "TODAY'S CHALLENGES";
    this._dailyBody.appendChild(dailyHdr);
    daily.forEach(ch => this._dailyBody.appendChild(renderChallenge(ch, false)));

    // Weekly section
    const weeklyHdr = document.createElement('div');
    weeklyHdr.style.cssText = 'font-size:9px;color:#aa44ff;letter-spacing:2px;margin:16px 0 10px;';
    weeklyHdr.textContent = "THIS WEEK'S CHALLENGES";
    this._dailyBody.appendChild(weeklyHdr);
    weekly.forEach(ch => this._dailyBody.appendChild(renderChallenge(ch, true)));
  }

  // ── v0.6: Codex Panel ──────────────────────────────────────────────────────

  _buildCodex() {
    const panel = document.createElement('div');
    panel.id = 'hud-codex';
    panel.style.cssText = `
      display:none; position:fixed; top:50%; left:50%;
      transform:translate(-50%,-50%);
      background:rgba(6,8,18,0.97); border:1px solid #334;
      border-radius:6px; padding:0; z-index:8100;
      width:560px; max-height:80vh; color:#ccc;
      font-family:'Courier New',monospace; overflow:hidden;
      box-shadow:0 0 40px rgba(0,0,0,0.9);
      display:none; flex-direction:column;
    `;
    document.body.appendChild(panel);
    this._codexPanel = panel;

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:16px 20px 10px;border-bottom:1px solid #223;flex-shrink:0;';
    header.innerHTML = `<span style="color:#aaddff;font-size:15px;letter-spacing:2px;">// CODEX</span>`;
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'background:none;border:1px solid #334;color:#aaa;border-radius:3px;padding:2px 8px;cursor:pointer;font-family:inherit;';
    closeBtn.onclick = () => this.toggleCodex();
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // Progress bar
    this._codexProgress = document.createElement('div');
    this._codexProgress.style.cssText = 'padding:8px 20px;font-size:10px;color:#556;border-bottom:1px solid #112;flex-shrink:0;';
    panel.appendChild(this._codexProgress);

    // Tab bar
    const tabs = document.createElement('div');
    tabs.style.cssText = 'display:flex;gap:0;border-bottom:1px solid #223;flex-shrink:0;overflow-x:auto;';
    panel.appendChild(tabs);

    // Content
    this._codexContent = document.createElement('div');
    this._codexContent.style.cssText = 'flex:1;overflow-y:auto;padding:14px 20px;';
    panel.appendChild(this._codexContent);

    const tabDefs = [
      { key:'history',  label:'History'  },
      { key:'bestiary', label:'Bestiary' },
      { key:'shards',   label:'Shards'   },
      { key:'scrolls',  label:'Scrolls'  },
      { key:'npcs',     label:'People'   },
      { key:'regions',  label:'Regions'  },
    ];
    this._codexTab = 'history';
    this._codexTabEls = {};

    tabDefs.forEach(({ key, label }) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.style.cssText = `background:none;border:none;border-bottom:2px solid transparent;
        color:#667;font-family:inherit;font-size:10px;letter-spacing:1px;
        padding:8px 14px;cursor:pointer;white-space:nowrap;`;
      btn.onclick = () => { this._codexTab = key; this._renderCodex(); };
      tabs.appendChild(btn);
      this._codexTabEls[key] = btn;
    });
  }

  toggleCodex() {
    this.codexOpen = !this.codexOpen;
    if (!this._codexPanel) return;
    this._codexPanel.style.display = this.codexOpen ? 'flex' : 'none';
    if (this.codexOpen) this._renderCodex();
  }

  _renderCodex() {
    if (!this._codexContent || !this._codexSystem) {
      if (this._codexContent) this._codexContent.innerHTML = '<div style="color:#445;font-size:11px;padding:20px;">Explore the world to unlock lore entries.</div>';
      return;
    }

    // Highlight active tab
    Object.entries(this._codexTabEls ?? {}).forEach(([k, btn]) => {
      btn.style.color       = k === this._codexTab ? '#aaddff' : '#667';
      btn.style.borderColor = k === this._codexTab ? '#aaddff' : 'transparent';
    });

    // Progress
    const prog = this._codexSystem.getProgress();
    if (this._codexProgress) {
      const pct = prog.pct;
      this._codexProgress.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="flex:1;background:#111;border-radius:2px;height:4px;">
            <div style="width:${pct}%;background:#4488ff;height:100%;border-radius:2px;transition:width 0.4s;"></div>
          </div>
          <span>${prog.foundN}/${prog.totalN} discovered (${pct}%)</span>
        </div>`;
    }

    const all = this._codexSystem.getAll();
    this._codexContent.innerHTML = '';
    const tab = this._codexTab;

    // REGIONS tab — show all 5 with discovered/undiscovered state
    if (tab === 'regions') {
      const { REGIONS } = { REGIONS: { HEARTHMOOR:{name:'Hearthmoor',subtitle:'The Last Village',color:'#ffd700'}, ELANDOR:{name:'Elandor Plains',subtitle:'The Breadbasket of Aethoria',color:'#88dd44'}, WHISPERING:{name:'Whispering Marshes',subtitle:'Where Spirits Linger',color:'#44ccaa'}, ASHVEIL:{name:'Ashveil Peaks',subtitle:'Volcanic Highlands',color:'#ff6633'}, SHATTERED:{name:'Shattered Coast',subtitle:'The Edge of the World',color:'#4488ff'} } };
      const visited = new Set(this._codexSystem.getUnlocked('regions'));
      Object.entries(REGIONS).forEach(([id, r]) => {
        const found = visited.has(id);
        const div = document.createElement('div');
        div.style.cssText = `margin-bottom:14px;opacity:${found?'1':'0.35'};border-left:3px solid ${found?r.color:'#334'};padding-left:12px;`;
        div.innerHTML = `
          <div style="color:${r.color};font-size:12px;margin-bottom:3px;">${r.name}</div>
          <div style="font-size:9px;color:#667;margin-bottom:4px;">${r.subtitle}</div>
          <div style="font-size:10px;color:#889;line-height:1.5;">${found ? '(visit to read lore)' : '— not yet visited —'}</div>`;
        this._codexContent.appendChild(div);
      });
      return;
    }

    let entries = [];
    if (tab === 'history')  entries = all.history;
    if (tab === 'bestiary') entries = all.bestiary;
    if (tab === 'shards')   entries = all.shards;
    if (tab === 'scrolls')  entries = all.scrolls;
    if (tab === 'npcs')     entries = all.npcs;

    if (!entries.length) {
      const empty = document.createElement('div');
      empty.style.cssText = 'color:#445;font-size:11px;padding:20px 0;';
      empty.textContent = 'No entries discovered yet. Keep exploring.';
      this._codexContent.appendChild(empty);
      return;
    }

    entries.forEach(entry => {
      const div = document.createElement('div');
      div.style.cssText = 'margin-bottom:18px;border-bottom:1px solid #112;padding-bottom:16px;cursor:pointer;';
      const titleColor = tab === 'shards' ? '#cc88ff' : tab === 'bestiary' ? '#ff8844' : tab === 'npcs' ? '#ffd700' : '#aaddff';
      const titleText  = entry.title ?? entry.name ?? entry.id ?? '???';
      const bodyText   = entry.text ?? entry.backstory ?? entry.lore ?? entry.desc ?? '';
      const subtitleText = entry.location ?? entry.secret ?? '';
      div.innerHTML = `
        <div style="color:${titleColor};font-size:11px;margin-bottom:4px;font-weight:bold;">${titleText}</div>
        ${subtitleText ? `<div style="font-size:9px;color:#667;margin-bottom:5px;font-style:italic;">${subtitleText}</div>` : ''}
        <div style="font-size:10px;color:#889;line-height:1.6;">${bodyText}</div>`;
      this._codexContent.appendChild(div);
    });
  }


  // ── v0.7: Prestige Panel (shown via Elder Lyra dialogue) ─────────────────────

  _showPrestigePanel(prestigeSystem) {
    // Remove any existing panel
    document.getElementById('prestige-panel')?.remove();

    const ps   = prestigeSystem;
    const data = ps.getUIData();
    const next = data.nextRank;
    if (!next) return;  // already max rank

    const panel = document.createElement('div');
    panel.id = 'prestige-panel';
    panel.style.cssText = `
      position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
      background:rgba(8,4,18,0.98); border:2px solid #8844cc;
      border-radius:8px; padding:24px 28px; z-index:9200;
      font-family:'Courier New',monospace; width:420px;
      box-shadow:0 0 40px rgba(120,40,200,0.5), 0 0 80px rgba(60,0,100,0.3);
    `;

    const bonusLines = Object.entries(next.bonuses).map(([k, v]) => {
      const labels = {
        maxHp:'Max HP', attack:'Attack', defense:'Defense',
        manaRegen:'Mana Regen/s', xpMult:'XP Gain',
        abilityDmgMult:'Ability Damage', startGold:'Starting Gold',
      };
      const fmt = k === 'xpMult' || k === 'abilityDmgMult' ? `+${Math.round(v*100)}%` : `+${v}`;
      return `<div style="color:#cc88ff;font-size:10px;">✦ ${labels[k]??k}: ${fmt}</div>`;
    }).join('');

    const titleLine = next.title
      ? `<div style="color:#ffaa00;font-size:10px;margin-top:6px;">★ Unlocks title: "${next.title}"</div>`
      : '';

    panel.innerHTML = `
      <div style="text-align:center;margin-bottom:16px;">
        <div style="font-size:11px;color:#8844cc;letter-spacing:3px;margin-bottom:6px;">✦ PRESTIGE ✦</div>
        <div style="font-size:18px;color:#cc88ff;">Rank ${data.rank} → ${data.rank + 1}</div>
        <div style="font-size:9px;color:#556;margin-top:4px;">${data.rank + 1} / ${data.maxRank}</div>
      </div>

      <div style="background:rgba(60,20,100,0.3);border-radius:5px;padding:12px;margin-bottom:16px;">
        <div style="font-size:9px;color:#667;letter-spacing:2px;margin-bottom:8px;">PERMANENT REWARDS</div>
        ${bonusLines}
        ${titleLine}
      </div>

      <div style="background:rgba(80,0,0,0.3);border-radius:5px;padding:10px;margin-bottom:16px;">
        <div style="font-size:9px;color:#cc4444;letter-spacing:1px;margin-bottom:4px;">⚠ WARNING</div>
        <div style="font-size:9px;color:#aa6666;line-height:1.5;">
          Prestige resets your level, inventory, and gold.<br>
          Skill tree unlocks and equipment are lost.<br>
          All permanent bonuses carry forward.
        </div>
      </div>

      <div style="display:flex;gap:10px;">
        <button id="prestige-confirm" style="
          flex:1;padding:10px;border-radius:4px;cursor:pointer;
          background:rgba(120,40,200,0.3);border:1px solid #8844cc;
          color:#cc88ff;font-family:inherit;font-size:11px;letter-spacing:1px;
        ">✦ BECOME REBORN</button>
        <button id="prestige-cancel" style="
          flex:1;padding:10px;border-radius:4px;cursor:pointer;
          background:transparent;border:1px solid #334;
          color:#667;font-family:inherit;font-size:11px;
        ">Not yet</button>
      </div>
    `;

    document.body.appendChild(panel);

    document.getElementById('prestige-cancel').onclick = () => panel.remove();
    document.getElementById('prestige-confirm').onclick = () => {
      panel.remove();
      const result = ps.doPrestige(this._player);
      if (!result) return;

      // Apply immediate stat boost from this rank
      ps.applyToPlayer(this._player);
      this._gameScene?.eventBus?.emit('statsChanged', this._player?.stats);

      // Show confirmation
      this.logMsg(`✦ PRESTIGE RANK ${result.rank}! ${result.def.title ? '"' + result.def.title + '"' : 'Reborn.'}`, '#cc88ff');
      this._gameScene?.eventBus?.emit('levelUp', this._player?.stats?.level);
    };
  }

  // ── v0.6: Region Entry Banner ─────────────────────────────────────────────

  _buildRegionBanner() {
    const el = document.createElement('div');
    el.id = 'hud-region-banner';
    el.style.cssText = `
      position:fixed; top:18%; left:50%; transform:translateX(-50%) scale(0.8);
      background:rgba(4,6,14,0.92); border:1px solid #334;
      border-radius:5px; padding:14px 28px; z-index:8200;
      font-family:'Courier New',monospace; text-align:center;
      pointer-events:none; opacity:0;
      transition:opacity 0.5s, transform 0.5s;
      min-width:260px;
    `;
    document.body.appendChild(el);
    this._regionBanner = el;
  }

  showRegionBanner(region) {
    if (!this._regionBanner) return;
    const col = region.color ?? '#aaaaaa';
    this._regionBanner.innerHTML = `
      <div style="font-size:10px;color:#556;letter-spacing:2px;margin-bottom:4px;">ENTERING</div>
      <div style="font-size:16px;color:${col};letter-spacing:1px;margin-bottom:2px;">${region.name}</div>
      <div style="font-size:9px;color:#778;font-style:italic;">${region.subtitle ?? ''}</div>
    `;
    this._regionBanner.style.opacity = '1';
    this._regionBanner.style.transform = 'translateX(-50%) scale(1)';
    // also show border glow matching region colour
    this._regionBanner.style.boxShadow = `0 0 18px rgba(${region.cssGlow ?? '100,100,200'},0.4)`;

    clearTimeout(this._regionBannerTimer);
    this._regionBannerTimer = setTimeout(() => {
      this._regionBanner.style.opacity = '0';
      this._regionBanner.style.transform = 'translateX(-50%) scale(0.85)';
    }, 3500);
  }

  // ── v0.6: Scroll Reader ───────────────────────────────────────────────────

  _buildScrollReader() {
    const panel = document.createElement('div');
    panel.id = 'hud-scroll-reader';
    panel.style.cssText = `
      display:none; position:fixed; top:50%; left:50%;
      transform:translate(-50%,-50%);
      background:rgba(10,8,4,0.97); border:1px solid #554;
      border-radius:5px; padding:26px 30px; z-index:8300;
      width:440px; max-height:70vh; overflow-y:auto;
      font-family:'Courier New',monospace;
      box-shadow:0 0 30px rgba(100,80,0,0.4);
    `;
    document.body.appendChild(panel);
    this._scrollReaderPanel = panel;

    panel.addEventListener('click', () => {
      panel.style.display = 'none';
    });
  }

  showScrollReader(scroll) {
    if (!this._scrollReaderPanel || !scroll) return;
    this._scrollReaderPanel.innerHTML = `
      <div style="font-size:9px;color:#665;letter-spacing:2px;margin-bottom:10px;">LORE SCROLL</div>
      <div style="font-size:13px;color:#ddcc88;margin-bottom:12px;border-bottom:1px solid #443;padding-bottom:8px;">${scroll.title ?? 'Untitled'}</div>
      <div style="font-size:11px;color:#aaa;line-height:1.75;white-space:pre-wrap;">${scroll.text ?? ''}</div>
      <div style="margin-top:16px;font-size:9px;color:#443;text-align:center;">— click anywhere to close —</div>
    `;
    this._scrollReaderPanel.style.display = 'block';
    // Auto-close after 25 seconds
    clearTimeout(this._scrollReaderTimer);
    this._scrollReaderTimer = setTimeout(() => {
      if (this._scrollReaderPanel) this._scrollReaderPanel.style.display = 'none';
    }, 25000);
  }


  // ── v0.6: Player Stat Screen (P) ────────────────────────────────────────────

  _buildStatScreen() {
    const panel = document.createElement('div');
    panel.id = 'hud-statscreen';
    panel.style.cssText = `
      display:none; position:fixed; top:50%; left:50%;
      transform:translate(-50%,-50%);
      background:rgba(6,8,18,0.97); border:1px solid #334;
      border-radius:6px; z-index:8100; width:520px; max-height:85vh;
      font-family:'Courier New',monospace; overflow:hidden;
      flex-direction:column; box-shadow:0 0 40px rgba(0,0,0,0.9);
    `;
    document.body.appendChild(panel);
    this._statScreen = panel;

    // Header
    const hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:14px 20px 10px;border-bottom:1px solid #223;flex-shrink:0;';
    hdr.innerHTML = '<span style="color:#d4af37;font-size:15px;letter-spacing:2px;">// CHARACTER</span>';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'background:none;border:1px solid #334;color:#aaa;border-radius:3px;padding:2px 8px;cursor:pointer;font-family:inherit;';
    closeBtn.onclick = () => this.toggleStatScreen();
    hdr.appendChild(closeBtn);
    panel.appendChild(hdr);

    this._statScreenBody = document.createElement('div');
    this._statScreenBody.style.cssText = 'flex:1;overflow-y:auto;padding:16px 20px;';
    panel.appendChild(this._statScreenBody);
  }

  toggleStatScreen() {
    this.statOpen = !this.statOpen;
    if (!this._statScreen) return;
    this._statScreen.style.display = this.statOpen ? 'flex' : 'none';
    if (this.statOpen) this._renderStatScreen();
  }

  _renderStatScreen() {
    if (!this._statScreenBody) return;
    const p = this._player;
    if (!p) { this._statScreenBody.innerHTML = '<div style="color:#445;">No player data.</div>'; return; }
    const s = p.stats;
    const cls = p.playerClass ?? 'WARRIOR';
    const clsColors = { WARRIOR:'#ff6633', MAGE:'#cc44ff', RANGER:'#44cc44' };
    const clsColor  = clsColors[cls] ?? '#d4af37';

    // Build HTML
    const enc = p.enchantments ?? {};
    const encWeapon = enc[p.equipment?.weapon] ?? [];
    const encArmor  = enc[p.equipment?.armor]  ?? [];

    const statRow = (label, val, color='#ccc') =>
      `<div style="display:flex;justify-content:space-between;margin-bottom:5px;">
        <span style="color:#667;">${label}</span>
        <span style="color:${color};font-weight:bold;">${val}</span>
      </div>`;

    const bar = (label, cur, max, color) => {
      const pct = Math.min(100, cur / max * 100).toFixed(1);
      return `<div style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;font-size:9px;color:#667;margin-bottom:2px;">
          <span>${label}</span><span>${Math.floor(cur)}/${max}</span>
        </div>
        <div style="background:#111;border-radius:2px;height:6px;">
          <div style="width:${pct}%;background:${color};height:100%;border-radius:2px;transition:width 0.3s;"></div>
        </div>
      </div>`;
    };

    const itemDisplay = (itemKey, slot) => {
      if (!itemKey) return `<span style="color:#334;">— empty —</span>`;
      const item = CONFIG.ITEMS[itemKey];
      if (!item) return itemKey;
      const rarity = item.rarity ?? 'common';
      const rarColors = {common:'#aaa',uncommon:'#44ff44',rare:'#4488ff',epic:'#aa44ff',legendary:'#ffaa00'};
      const col = rarColors[rarity] ?? '#aaa';
      const encs = enc[itemKey] ?? [];
      const encStr = encs.length ? ` <span style="color:#cc88ff;">[${encs.map(e=>e.id+'+'+e.level).join(', ')}]</span>` : '';
      const stat = item.atk ? `+${item.atk} ATK` : item.def ? `+${item.def} DEF` : '';
      return `<span style="color:${col};">${item.name}</span> <span style="color:#667;font-size:9px;">${stat}</span>${encStr}`;
    };

    // Faction summary
    const factions = this.factionSystem?.getSummary?.() ?? [];
    const factionHtml = factions.slice(0,4).map(f =>
      `<div style="display:flex;justify-content:space-between;margin-bottom:3px;font-size:9px;">
        <span style="color:${f.color};">${f.name}</span>
        <span style="color:${f.standingData?.color??'#aaa'}">${f.standingData?.label??f.standing} (${f.rep>0?'+':''}${f.rep})</span>
      </div>`
    ).join('');

    // Abilities
    const abilityData = this._abilitySystem?.getSlotData?.() ?? [];
    const abilityHtml = abilityData.map(a =>
      `<div style="display:flex;justify-content:space-between;margin-bottom:3px;font-size:9px;">
        <span style="color:${a.color};">[${a.slot}] ${a.icon} ${a.name}</span>
        <span style="color:#667;">${a.manaCost}mp · ${a.cooldown}s cd</span>
      </div>`
    ).join('');

    // Codex progress
    const prog = this._codexSystem?.getProgress?.();
    const progHtml = prog
      ? `<div style="font-size:10px;color:#667;margin-bottom:6px;">${prog.foundN}/${prog.totalN} discovered (${prog.pct}%)</div>
         <div style="background:#111;border-radius:2px;height:4px;margin-bottom:10px;">
           <div style="width:${prog.pct}%;background:#4488ff;height:100%;border-radius:2px;"></div>
         </div>` : '';

    this._statScreenBody.innerHTML = `
      <!-- Class header -->
      <div style="text-align:center;margin-bottom:16px;">
        <div style="font-size:18px;color:${clsColor};letter-spacing:2px;">${s.name ?? 'Hero'}</div>
        <div style="font-size:11px;color:#667;margin-top:2px;">Level ${s.level} ${cls} · ${this._gameScene?.regionSystem?.getCurrent()?.name ?? 'Hearthmoor'}</div>
      </div>

      <!-- Bars -->
      <div style="margin-bottom:14px;">
        ${bar('HP', s.hp, s.maxHp, '#ff4444')}
        ${bar('Mana', s.mana??100, s.maxMana??100, '#4488ff')}
        ${bar('XP', s.xp, s.xpNeeded, '#d4af37')}
      </div>

      <!-- Core stats -->
      <div style="border:1px solid #223;border-radius:4px;padding:10px 12px;margin-bottom:12px;">
        <div style="font-size:9px;color:#556;letter-spacing:2px;margin-bottom:8px;">COMBAT STATS</div>
        ${statRow('Attack',  s.attack,  '#ff8844')}
        ${statRow('Defense', s.defense, '#4488ff')}
        ${statRow('Speed',   (s.speed * 16).toFixed(0) + ' px/s', '#44cc44')}
        ${statRow('Gold',    (s.gold ?? 0) + 'g', '#d4af37')}
        ${statRow('Kills',   this._gameScene?.achievements?._data?.stats?.kills ?? 0, '#cc4444')}
        ${statRow('Quests Done', this._gameScene?.questSystem?.done?.length ?? 0, '#88aaff')}
      </div>

      <!-- Equipment -->
      <div style="border:1px solid #223;border-radius:4px;padding:10px 12px;margin-bottom:12px;">
        <div style="font-size:9px;color:#556;letter-spacing:2px;margin-bottom:8px;">EQUIPMENT</div>
        <div style="margin-bottom:6px;font-size:10px;">⚔ ${itemDisplay(p.equipment?.weapon, 'weapon')}</div>
        <div style="font-size:10px;">🛡 ${itemDisplay(p.equipment?.armor,  'armor')}</div>
      </div>

      <!-- Abilities -->
      <div style="border:1px solid #223;border-radius:4px;padding:10px 12px;margin-bottom:12px;">
        <div style="font-size:9px;color:#556;letter-spacing:2px;margin-bottom:8px;">ABILITIES</div>
        ${abilityHtml || '<div style="color:#445;font-size:9px;">No abilities loaded.</div>'}
      </div>

      <!-- Factions -->
      <div style="border:1px solid #223;border-radius:4px;padding:10px 12px;margin-bottom:12px;">
        <div style="font-size:9px;color:#556;letter-spacing:2px;margin-bottom:8px;">FACTION STANDING</div>
        ${factionHtml || '<div style="color:#445;font-size:9px;">No faction data.</div>'}
      </div>

      <!-- Codex progress -->
      <div style="border:1px solid #223;border-radius:4px;padding:10px 12px;">
        <div style="font-size:9px;color:#556;letter-spacing:2px;margin-bottom:8px;">CODEX PROGRESS</div>
        ${progHtml || '<div style="color:#445;font-size:9px;">Explore to discover lore.</div>'}
      </div>
    `;
  }

  // ── Mobile touch controls — v0.6 complete overhaul ─────────────────────────

  _buildMobileControls() {
    // ── Floating joystick (positioned dynamically in update()) ───────────────
    const joystickBase = document.createElement('div');
    joystickBase.id = 'mobile-joystick';
    const joystickKnob = document.createElement('div');
    joystickKnob.id = 'mobile-joystick-knob';
    joystickBase.appendChild(joystickKnob);
    document.body.appendChild(joystickBase);
    this._joystickBaseEl = joystickBase;
    this._joystickKnobEl = joystickKnob;

    // Legacy empty div so old CSS selector still matches
    const legacyDiv = document.createElement('div');
    legacyDiv.id = 'mobile-buttons';
    document.body.appendChild(legacyDiv);
    this._mobileButtonsEl = legacyDiv;

    // ── Quick menu strip (top-right) ─────────────────────────────────────────
    const quickMenu = document.createElement('div');
    quickMenu.id = 'mobile-quick-menu';

    const quickBtns = [
      { icon:'🗺', label:'Map',        action:()=> this.toggleMap() },
      { icon:'📦', label:'Inv',        action:()=> this.toggleInventory(this._player) },
      { icon:'📜', label:'Quests',     action:()=> this.toggleQuests() },
      { icon:'⚙',  label:'Stats',      action:()=> this.toggleStatScreen() },
      { icon:'📖', label:'Codex',      action:()=> this.toggleCodex() },
      { icon:'✅', label:'Challenges', action:()=> this.toggleDailyChallenges() },
    ];
    quickBtns.forEach(({ icon, label, action }) => {
      const btn = document.createElement('button');
      btn.className = 'mobile-btn small';
      btn.title = label;
      btn.innerHTML = `<span style="font-size:15px;">${icon}</span>`;
      btn.addEventListener('touchstart', action, { passive: true });
      btn.addEventListener('click', action);
      quickMenu.appendChild(btn);
    });
    document.body.appendChild(quickMenu);

    // ── Core action arc (right side, above ability grid) ─────────────────────
    const actionArc = document.createElement('div');
    actionArc.id = 'mobile-action-arc';

    // ATTACK — largest, most prominent
    const btnAttack = document.createElement('button');
    btnAttack.className = 'mobile-btn attack-btn';
    btnAttack.title = 'Attack (nearest enemy)';
    btnAttack.textContent = '⚔';
    btnAttack.addEventListener('touchstart', () => this._mobileAttack(), { passive: true });
    btnAttack.addEventListener('click', () => this._mobileAttack());
    actionArc.appendChild(btnAttack);

    // INTERACT
    const btnInteract = document.createElement('button');
    btnInteract.className = 'mobile-btn';
    btnInteract.title = 'Interact (E)';
    btnInteract.textContent = '💬';
    const fireE = () => window.dispatchEvent(new KeyboardEvent('keydown', { key:'e', bubbles:true }));
    btnInteract.addEventListener('touchstart', fireE, { passive: true });
    btnInteract.addEventListener('click', fireE);
    actionArc.appendChild(btnInteract);

    // SKILL TREE toggle
    const btnSkills = document.createElement('button');
    btnSkills.className = 'mobile-btn small';
    btnSkills.title = 'Skill Tree (K)';
    btnSkills.textContent = '⚡';
    const fireK = () => this.toggleSkillTree(this._player);
    btnSkills.addEventListener('touchstart', fireK, { passive: true });
    btnSkills.addEventListener('click', fireK);
    actionArc.appendChild(btnSkills);

    document.body.appendChild(actionArc);

    // ── Ability grid (2×2, bottom right) ─────────────────────────────────────
    const abilityGrid = document.createElement('div');
    abilityGrid.id = 'mobile-ability-grid';

    this._mobileAbilityBtns = [];
    const abilityLabels = ['1','2','3','4'];
    for (let i = 0; i < 4; i++) {
      const btn = document.createElement('button');
      btn.className = 'mobile-btn ability';
      btn.dataset.slot = i;

      const iconEl = document.createElement('div');
      iconEl.style.cssText = 'font-size:22px;line-height:1;pointer-events:none;';
      iconEl.textContent = '—';
      btn.appendChild(iconEl);

      const nameEl = document.createElement('div');
      nameEl.className = 'mob-ability-name';
      nameEl.textContent = abilityLabels[i];
      btn.appendChild(nameEl);

      const cdOverlay = document.createElement('div');
      cdOverlay.className = 'mob-cd';
      btn.appendChild(cdOverlay);
      btn._cdOverlay  = cdOverlay;
      btn._iconEl     = iconEl;
      btn._nameEl     = nameEl;

      const fire = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: String(i+1), bubbles:true }));
      btn.addEventListener('touchstart', fire, { passive: true });
      btn.addEventListener('click', fire);

      abilityGrid.appendChild(btn);
      this._mobileAbilityBtns.push(btn);
    }
    document.body.appendChild(abilityGrid);

    this._mobileEls = [joystickBase, legacyDiv, quickMenu, actionArc, abilityGrid];
  }

  /** Target and move toward the nearest living enemy within range. */
  _mobileAttack() {
    if (!this._gameScene || !this._player) return;
    let nearest = null;
    let nearestDist = Infinity;
    this._gameScene.enemies?.forEach(e => {
      if (!e.isDead) {
        const d = e.position.distanceTo(this._player.position);
        if (d < nearestDist) { nearestDist = d; nearest = e; }
      }
    });
    if (nearest && nearestDist < 25) {
      this._player.setTarget(nearest);
    }
  }

  /**
   * Show a floating text at screen coordinates.
   * @param {number} screenX
   * @param {number} screenY
   * @param {string} text
   * @param {string} color
   */
  showFloatingText(screenX, screenY, text, color = '#ffffff') {
    const el = document.createElement('div');
    Object.assign(el.style, {
      position:      'fixed',
      left:          screenX + 'px',
      top:           screenY + 'px',
      transform:     'translate(-50%,-50%)',
      fontFamily:    THEME.font,
      fontSize:      '16px',
      fontWeight:    'bold',
      color,
      textShadow:    '1px 1px 3px #000',
      pointerEvents: 'none',
      zIndex:        '500',
      transition:    'none',
    });
    el.textContent = String(text);
    document.body.appendChild(el);

    let age = 0;
    const startY = screenY;
    const step = () => {
      age += 0.016;
      const t = age / 1.0;
      el.style.top     = (startY - 55 * t) + 'px';
      el.style.opacity = String(Math.max(0, 1 - t * 1.5));
      if (age < 1.0) requestAnimationFrame(step);
      else el.parentNode?.removeChild(el);
    };
    requestAnimationFrame(step);
  }

  // ── Keyboard bindings ────────────────────────────────────────────────────────

  _bindKeys() {
    this._keyHandler = (e) => {
      // Ignore if typing in dialogue input
      if (document.activeElement === this._dlgInput) return;
      switch (e.key.toLowerCase()) {
        case 'i': this.toggleInventory(this._player); break;
        case 'm': this.toggleMap();        break;
        case 'q': this.toggleQuests();     break;
        case 'k': this.toggleSkillTree(this._player); break;
        case 'f': this.toggleFactions(); break;
        case 'n': this.toggleEnchant(); break;
        case 'c': this.toggleCodex(); break;
        case 'a': this.toggleAchievements(); break;
        case 'd': this.toggleDailyChallenges(); break;
        case 'p': this.toggleStatScreen(); break;
        case 'escape':
          if (this.invOpen)   this.toggleInventory();
          if (this.mapOpen)   this.toggleMap();
          if (this.skillOpen) this.toggleSkillTree();
          if (this.tradeOpen) { this.tradeOpen = false; const t = document.getElementById('hud-trade'); if(t) t.style.display='none'; }
          if (this.factionOpen) this.toggleFactions();
          if (this.enchantOpen)  this.toggleEnchant();
          if (this.codexOpen)    this.toggleCodex();
          if (this.achOpen)      this.toggleAchievements();
          if (this.dailyOpen)    this.toggleDailyChallenges();
          if (this.statOpen)     this.toggleStatScreen();
          this._closeDialogue();
          break;
      }
    };
    window.addEventListener('keydown', this._keyHandler);
  }

  toggleQuests() {
    this.questOpen = !this.questOpen;
    if (this._questPanel) {
      this._questPanel.style.display = this.questOpen ? 'block' : 'block'; // always visible
      // Animate opacity as a "highlight"
      this._questPanel.style.opacity = '1';
    }
    this.refreshQuests();
  }

  // ── anyPanelOpen ─────────────────────────────────────────────────────────────

  anyPanelOpen() {
    return this.invOpen || this.mapOpen || this.skillOpen || this.tradeOpen ||
           this._dlgPanel.classList.contains('open');
  }

  // ── bindGame ─────────────────────────────────────────────────────────────────

  /**
   * Connect HUD to the game scene after creation.
   * @param {import('../scenes/GameScene.js').GameScene} gameScene
   */
  bindGame(gameScene) {
    if (gameScene.factionSystem)  this.factionSystem  = gameScene.factionSystem;
    if (gameScene.enchantSystem)  this._enchantSystem = gameScene.enchantSystem;
    if (gameScene.combatSystem)   this._combatSystem  = gameScene.combatSystem;
    if (gameScene.codexSystem)    this._codexSystem   = gameScene.codexSystem;
    if (gameScene.regionSystem)   this._regionSystem  = gameScene.regionSystem;
    this._gameScene   = gameScene;
    this._player      = gameScene.player;
    this._mapData     = gameScene.mapData;
    this.questSystem  = gameScene.questSystem || this.questSystem;
    this.tradeSystem  = gameScene.tradeSystem || this.tradeSystem;

    const bus = this.eventBus;
    bus.on('statsChanged',     s  => this._updateStats(s));
    bus.on('inventoryChanged', () => { if (this.invOpen) this._renderInv(this._player); });
    bus.on('levelUp',          lv => this.logMsg('Level Up! Now level ' + lv, '#ffd700'));
    bus.on('questAdded',       () => this.refreshQuests());

    this._updateStats(this._player?.stats);
    this.refreshQuests();
  }

  // ── Per-frame update ──────────────────────────────────────────────────────────

  /**
   * Called every frame from GameScene.update().
   * @param {import('../scenes/GameScene.js').GameScene} gs
   */
  update(gs) {
    if (gs.player && gs.player !== this._player) {
      this._player  = gs.player;
      this._mapData = gs.mapData;
    }
    // Stats refresh every frame (cheap DOM update is fine since we check changes)
    if (this._player) this._updateStats(this._player.stats);

    // Clock
    if (this._clockEl && gs.dayNight) {
      this._clockEl.textContent = gs.dayNight.getTimeString();
    }

    // Mobile joystick visual
    if (this._joystickBaseEl && gs.input) {
      const input = gs.input;
      if (input.joystickIsActive && input.joystickOrigin) {
        const origin = input.joystickOrigin;
        this._joystickBaseEl.style.display = 'block';
        this._joystickBaseEl.style.left    = origin.x + 'px';
        this._joystickBaseEl.style.top     = origin.y + 'px';
        const jx = input.joystick.x * input.joystickRadius;
        const jy = input.joystick.y * input.joystickRadius;
        this._joystickKnobEl.style.transform =
          `translate(calc(-50% + ${jx}px), calc(-50% + ${jy}px))`;
      } else {
        this._joystickBaseEl.style.display = 'none';
      }
    }
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────────

  dispose() {
    clearInterval(this._mmInterval);
    clearTimeout(this._actBannerTimer);
    clearTimeout(this._evBannerTimer);
    clearTimeout(this._achTimer);
    window.removeEventListener('keydown', this._keyHandler);

    // Remove all added DOM elements
    [
      document.getElementById('hud-stats'),
      document.getElementById('hud-minimap'),
      document.getElementById('hud-log'),
      document.getElementById('hud-quests'),
      document.getElementById('hud-clock'),
      document.getElementById('hud-inventory'),
      document.getElementById('hud-dialogue'),
      document.getElementById('hud-map'),
      document.getElementById('hud-skills'),
      document.getElementById('hud-achievement'),
      document.getElementById('hud-event-banner'),
      document.getElementById('hud-act-banner'),
      document.getElementById('hud-hint'),
      document.getElementById('hud-trade'),
    ].forEach(el => el?.parentNode?.removeChild(el));

    // Remove mobile controls
    this._mobileEls?.forEach(el => el?.parentNode?.removeChild(el));
    this._mobileEls = [];
  }
}
