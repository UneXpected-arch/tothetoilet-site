/* WIPE Leaderboard – usernames + public roasts + share
   - First visit: asks for username (saved to localStorage)
   - Change anytime from the board
   - Stores scores locally, ranks, and renders Top Degens
*/

(function(){
  const KEY_USER   = 'wipe_user_v1';
  const KEY_SCORES = 'wipe_scores_v1';
  const MAX_ENTRIES = 25;

  // ---------- DOM helpers ----------
  const $ = sel => document.querySelector(sel);
  const fmtNum = n => n.toLocaleString(undefined);
  const escapeHtml = s => (s??'').toString()
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');

  // ---------- Storage ----------
  function load(key, fallback){ try{ return JSON.parse(localStorage.getItem(key)) ?? fallback; }catch{ return fallback; } }
  function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
  function nowISO(){ return new Date().toISOString(); }

  // ---------- Username ----------
  function getUser() {
    let u = load(KEY_USER, null);
    if (u && u.name) return u;
    return null;
  }
  function setUser(name) {
    const clean = (name||'').trim().slice(0, 24) || randomName();
    const u = { name: clean };
    save(KEY_USER, u);
    return u;
  }
  function randomName(){ return `Degen-${Math.floor(Math.random()*9000+1000)}`; }

  // ---------- Modal (CSP-friendly, appended by JS) ----------
  function ensureModal() {
    if ($('#wl-modal')) return;
    const wrap = document.createElement('div');
    wrap.id = 'wl-modal';
    wrap.innerHTML = `
      <div class="wl-modal-backdrop" role="presentation"></div>
      <div class="wl-modal-card" role="dialog" aria-labelledby="wl-modal-title" aria-modal="true">
        <h3 id="wl-modal-title">Choose Your Degen Name</h3>
        <p class="wl-modal-sub">This will appear on the <b>Top Degens</b> board.</p>
        <form class="wl-modal-form" autocomplete="off">
          <input id="wl-name" class="wl-input" type="text" maxlength="24" placeholder="e.g. ToiletTycoon" required />
          <div class="wl-modal-actions">
            <button type="submit" class="wl-btn wl-primary">Save</button>
            <button type="button" class="wl-btn wl-ghost" id="wl-cancel">Cancel</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(wrap);

    // wire events
    wrap.querySelector('#wl-cancel').addEventListener('click', hideModal);
    wrap.querySelector('.wl-modal-backdrop').addEventListener('click', hideModal);
    wrap.querySelector('.wl-modal-form').addEventListener('submit', (e)=>{
      e.preventDefault();
      const val = wrap.querySelector('#wl-name').value;
      setUser(val);
      renderBoard(loadScores());
      hideModal();
    });
  }
  function showModal(prefillName=''){
    ensureModal();
    const box = $('#wl-modal');
    box.classList.add('open');
    const input = $('#wl-name');
    input.value = prefillName || '';
    setTimeout(()=>input.focus(), 0);
  }
  function hideModal(){
    const box = $('#wl-modal');
    if (box) box.classList.remove('open');
  }

  // ---------- Copy (roast / brag) ----------
  function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
  function roastLine() {
    const lines = [
      "Your bags are so heavy they sank the market. 🧻💥",
      "Rekt so hard the plunger called in sick. 🚽💀",
      "You paper-handed a paper roll. That’s meta. 🧻😬",
      "Even the meme gods muted notifications. 📉",
      "That score just got rug-pulled. Try again. 🪙🪤",
      "Liquidity? More like liquid-itty bitty. 💧🥲",
    ];
    return pick(lines);
  }
  function bragLine() {
    const lines = [
      "Certified Wipe Master. Don’t @ me. 🧻👑",
      "You caught the gains before they got flushed. 💦💰",
      "The toilet salutes your diamond roll. 💎🧻",
      "New high score? We’re not worthy. 🙇",
      "Moon mission launched from the bathroom. 🚀🚽",
    ];
    return pick(lines);
  }
  function verdict(score, rank, total, isPB){
    if (isPB) return `NEW PB ${fmtNum(score)} — ${bragLine()}`;
    const pct = total ? (rank/total) : 1;
    if (pct > 0.66) return `${roastLine()}  Score: ${fmtNum(score)}`;
    if (pct < 0.34) return `Top degen! ${bragLine()}  Score: ${fmtNum(score)}`;
    return `Solid wipe. Keep going. Score: ${fmtNum(score)}`;
  }

  // ---------- Scores ----------
  function loadScores(){
    const s = load(KEY_SCORES, []);
    return s.filter(x => typeof x.score === 'number')
            .sort((a,b)=> b.score - a.score)
            .slice(0, MAX_ENTRIES);
  }
  function pushScore(name, score){
    const all = loadScores();
    const entry = { name, score, at: nowISO() };
    all.push(entry);
    all.sort((a,b)=> b.score - a.score);
    const trimmed = all.slice(0, MAX_ENTRIES);
    save(KEY_SCORES, trimmed);

    const rank = trimmed.findIndex(e => e === entry) + 1;
    const bestForUser = trimmed.filter(e => e.name === name).sort((a,b)=> b.score-a.score)[0]?.score ?? score;
    const isPB = score >= bestForUser;
    return { trimmed, rank, isPB };
  }

  // ---------- Render ----------
  function xShareLink(e){
    const u = new URL('https://twitter.com/intent/tweet');
    const text = `I scored ${e.score} in WIPE — Catch the Gains! 🧻💰  Can you beat me? #WIPEcoin`;
    const url  = location.origin + '/game';
    u.searchParams.set('text', text);
    u.searchParams.set('url', url);
    return u.toString();
  }

  function renderBoard(list){
    const host = $('#wipe-leader');
    if (!host) return;

    const user = getUser();
    const name = user?.name ?? '';

    host.innerHTML = `
      <div class="wl-card">
        <div class="wl-head">
          <div class="wl-title">Top Degens</div>
          <div class="wl-usr">
            <span class="wl-me">Name: <b>${escapeHtml(name || '(not set)')}</b></span>
            <button class="wl-change wl-btn wl-ghost" type="button">Change name</button>
            <button class="wl-clear wl-btn" type="button" title="Clear my scores">Clear mine</button>
          </div>
        </div>
        <ol class="wl-list">
          ${list.length ? list.map((e,i)=>`
            <li class="wl-row">
              <span class="wl-rank">${i+1}</span>
              <span class="wl-name">${escapeHtml(e.name)}</span>
              <span class="wl-score">${fmtNum(e.score)}</span>
              <a class="wl-share" href="${xShareLink(e)}" target="_blank" rel="noopener" title="Share to X">⤴</a>
            </li>
          `).join('') : `<li class="wl-empty">No scores yet. Be the first. 🧻</li>`}
        </ol>
      </div>
    `;

    host.querySelector('.wl-change').addEventListener('click', ()=>{
      showModal(name);
    });
    host.querySelector('.wl-clear').addEventListener('click', ()=>{
      const me = (getUser()?.name) || '';
      const remaining = loadScores().filter(e => e.name !== me);
      save(KEY_SCORES, remaining);
      renderBoard(remaining);
    });
  }

  // ---------- Public API for the game ----------
  // Call this on GAME OVER with the final score
  window.updateLeaderboard = function(score){
    let user = getUser();
    if (!user) {
      // Ask for name, but still record this score under a temp name
      user = setUser(randomName());
      showModal('');
    }
    const { trimmed, rank, isPB } = pushScore(user.name, score);
    renderBoard(trimmed);
    const msg = verdict(score, rank, trimmed.length, isPB);

    if (typeof window.triggerMemeEffect === 'function') {
      window.triggerMemeEffect(msg);
    }
    return msg;
  };

  // Initial render and maybe prompt for name on first visit
  renderBoard(loadScores());
  if (!getUser()) {
    setTimeout(()=> showModal(''), 150);
  }
})();
