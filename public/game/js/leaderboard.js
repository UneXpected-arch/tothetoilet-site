// public/game/js/leaderboard.js
(function () {
  'use strict';

  const STORE_KEY = 'wipe_scores_v1';
  const NAME_KEY  = 'wipe_name_v1';
  const MAX_ENTRIES = 20;

  const root = document.getElementById('wipe-leader');
  if (!root) {
    // If the container is missing, don’t crash.
    console.warn('[WIPE] #wipe-leader container not found.');
    return;
  }

  // ---------- Storage helpers ----------
  function loadScores() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  function saveScores(list) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
    } catch {}
  }

  function getName() {
    let n = localStorage.getItem(NAME_KEY);
    if (!n) {
      n = 'Degen#' + Math.floor(100 + Math.random() * 900);
      localStorage.setItem(NAME_KEY, n);
    }
    return n;
  }

  function setName(n) {
    if (!n) return;
    n = String(n).trim().slice(0, 24);
    if (n) localStorage.setItem(NAME_KEY, n);
    render();
  }

  // ---------- Render ----------
  function fmtDate(ts) {
    try {
      return new Date(ts).toLocaleString(undefined, {
        month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return ''; }
  }

  function render() {
    const name = getName();
    const scores = loadScores().sort((a, b) => b.score - a.score || a.ts - b.ts);

    const top = scores.slice(0, 10);
    const myBest = scores
      .filter(s => s.name === name)
      .sort((a, b) => b.score - a.score)[0];

    root.innerHTML = `
      <section class="wipe-lb">
        <h3 class="wipe-lb__title">Top Degens 🧻</h3>
        <ol class="wipe-lb__list">
          ${top.map((s, i) => `
            <li class="wipe-lb__item">
              <span class="wipe-lb__rank">${i + 1}.</span>
              <span class="wipe-lb__name">${escapeHtml(s.name)}</span>
              <span class="wipe-lb__score">${s.score}</span>
              <span class="wipe-lb__time">${fmtDate(s.ts)}</span>
            </li>`).join('')}
        </ol>

        <div class="wipe-lb__me">
          <div>
            <strong>You:</strong> <span id="wipe-name">${escapeHtml(name)}</span>
            ${myBest ? `• <span class="wipe-lb__mebest">Best: ${myBest.score}</span>` : ''}
          </div>
          <div class="wipe-lb__actions">
            <button id="wipe-change-name" class="wipe-btn">Change name</button>
            <button id="wipe-share" class="wipe-btn wipe-btn--ghost">Share top</button>
          </div>
        </div>
      </section>
    `;

    // wire up buttons
    const changeBtn = root.querySelector('#wipe-change-name');
    const shareBtn  = root.querySelector('#wipe-share');

    changeBtn?.addEventListener('click', () => {
      const current = getName();
      const next = prompt('Enter your display name (max 24 chars):', current);
      if (next !== null) setName(next);
    });

    shareBtn?.addEventListener('click', () => {
      const best = myBest ? myBest.score : 0;
      const text = best
        ? `My WIPE best score: ${best} 💥 Can you beat me? #WIPEcoin`
        : `Playing WIPE 🧻💰 — come beat my score! #WIPEcoin`;
      const url = location.origin + location.pathname.replace(/\/game\/.*$/, '/');
      const u = new URL('https://twitter.com/intent/tweet');
      u.searchParams.set('text', text);
      u.searchParams.set('url', url);
      window.open(u.toString(), '_blank', 'noopener,noreferrer');
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  // ---------- Handle game-over event ----------
  window.addEventListener('WIPE_GAME_OVER', (ev) => {
    const score = (ev && ev.detail && typeof ev.detail.score === 'number')
      ? Math.max(0, Math.floor(ev.detail.score))
      : 0;

    const entry = { name: getName(), score, ts: Date.now() };
    const list = loadScores();

    // push & keep best unique entries per name (optional: allow multiples; here we keep all, then slice)
    list.push(entry);
    list.sort((a, b) => b.score - a.score || a.ts - b.ts);
    saveScores(list);
    render();
  });

  // Initial paint
  render();
})();
