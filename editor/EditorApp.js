/**
 * EditorApp.js — Aeth-Ed bootstrap
 * Wires navigation and mounts each panel into its DOM container.
 */

import { SaveInspector } from './panels/SaveInspector.js';
import { ConfigEditor   } from './panels/ConfigEditor.js';
import { QuestBrowser   } from './panels/QuestBrowser.js';
import { LoreBrowser    } from './panels/LoreBrowser.js';

// ── Global toast helper ───────────────────────────────────────────────────

const toastEl = document.getElementById('toast');
let _toastTimer = null;

export function toast(msg, type = 'ok', ms = 2800) {
  toastEl.textContent = msg;
  toastEl.className   = `show ${type}`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { toastEl.className = ''; }, ms);
}

// ── Panel registry ────────────────────────────────────────────────────────

const panels = {
  save:   { el: document.getElementById('panel-save'),   instance: null },
  config: { el: document.getElementById('panel-config'), instance: null },
  quests: { el: document.getElementById('panel-quests'), instance: null },
  lore:   { el: document.getElementById('panel-lore'),   instance: null },
};

// ── Navigation ────────────────────────────────────────────────────────────

const navBtns = document.querySelectorAll('.nav-btn[data-panel]');

function activatePanel(id) {
  // Update nav
  navBtns.forEach(b => b.classList.toggle('active', b.dataset.panel === id));

  // Update panels
  Object.entries(panels).forEach(([key, p]) => {
    p.el.classList.toggle('active', key === id);
  });

  // Lazy-init the panel on first activation
  const p = panels[id];
  if (!p.instance) {
    switch (id) {
      case 'save':   p.instance = new SaveInspector(p.el);  break;
      case 'config': p.instance = new ConfigEditor(p.el);   break;
      case 'quests': p.instance = new QuestBrowser(p.el);   break;
      case 'lore':   p.instance = new LoreBrowser(p.el);    break;
    }
  } else if (p.instance.onActivate) {
    p.instance.onActivate();
  }
}

navBtns.forEach(btn => {
  btn.addEventListener('click', () => activatePanel(btn.dataset.panel));
});

// Boot the default panel
activatePanel('save');
