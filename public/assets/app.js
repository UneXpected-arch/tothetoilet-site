// Parallax video (no eval, no inline)
(function(){
  const video = document.getElementById('bg-video');
  if (!video) return;
  const isMobile = matchMedia('(max-width:768px)').matches;
  let tx=0,ty=0,cx=0,cy=0;
  const max = isMobile ? 8 : 15, ease = 0.05;

  function set(x,y){
    const nx = (x/innerWidth)*2-1, ny = (y/innerHeight)*2-1;
    tx = nx*max; ty = ny*max;
  }
  addEventListener('mousemove', e=>set(e.clientX,e.clientY), {passive:true});
  addEventListener('touchmove', e=>{ if(e.touches[0]) set(e.touches[0].clientX,e.touches[0].clientY) }, {passive:true});

  (function loop(){
    cx += (tx-cx)*ease; cy += (ty-cy)*ease;
    video.style.transform = `translate(-50%,-50%) scale(1.05) translate(${cx.toFixed(2)}px,${cy.toFixed(2)}px)`;
    requestAnimationFrame(loop);
  })();

  // Reduced motion + video fail fallback
  if (matchMedia('(prefers-reduced-motion: reduce)').matches){ try{ video.pause(); video.removeAttribute('loop'); }catch(e){} }
  function fail(){ document.body.classList.add('no-video'); }
  video.addEventListener('error', fail, {once:true});
  setTimeout(()=>{ if (video.readyState < 2) fail(); }, 2000);
})();

// Floaters + sparkles (no eval, no inline handlers)
(function(){
  const layer = document.getElementById('float-layer');
  if (!layer) return;
  const isMobile = matchMedia('(max-width:768px)').matches;
  const MAX_MOBILE = 4;

  function spawnOne(){
    const img = new Image();
    img.className = 'float-item';
    const isCoin = Math.random() < 0.55;
    img.src  = isCoin ? '/assets/coin.png' : '/assets/tp-roll.png';
    img.alt  = isCoin ? 'Coin' : 'Toilet Paper Roll';
    img.style.left = (Math.random() * 92 + 4) + 'vw';
    img.style.top  = '110vh';

    const scale = isMobile ? (0.7 + Math.random()*0.5) : (0.8 + Math.random()*0.8);
    img.style.width = (80 * scale) + 'px';
    const speed = (isMobile ? 0.6 : 0.9) + Math.random()*0.6; // px per frame

    layer.appendChild(img);

    let y = window.innerHeight + 120;
    let t = 0;
    (function tick(){
      t += 1;
      y -= speed;
      const sway = Math.sin(t/40) * (isMobile ? 12 : 18);
      img.style.transform = `translate(${sway}px, ${y}px) rotate(${t*0.6}deg)`;

      if (t % (isMobile ? 12 : 8) === 0){
        const sp = document.createElement('div');
        sp.className = 'sparkle';
        const r = img.getBoundingClientRect();
        sp.style.left = (r.left + r.width/2) + 'px';
        sp.style.top  = (r.top  + r.height*0.7) + 'px';
        document.body.appendChild(sp);
        setTimeout(()=>sp.remove(), 850);
      }
      if (y > -140) requestAnimationFrame(tick);
      else img.remove();
    })();
  }

  function loopSpawn(){
    const count = layer.querySelectorAll('.float-item').length;
    if (!isMobile && count < 8) spawnOne();
    if (isMobile && count < MAX_MOBILE) spawnOne();
  }
  setInterval(loopSpawn, 900);

  // Hide floaters if assets missing
  Promise.all(['/assets/coin.png','/assets/tp-roll.png'].map(src => new Promise(r=>{
    const i=new Image(); i.onload=()=>r(true); i.onerror=()=>r(false); i.src=src;
  }))).then(([coinOK,tpOK])=>{
    if(!(coinOK && tpOK)) layer.style.display='none';
  });
})();

// Tweet feed (fetch from your own serverless API; no third-party scripts)
(function(){
  const feed = document.getElementById('tweet-feed');
  if (!feed) return;

  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
  function fmt(ts){ try{ return new Date(ts).toLocaleString([], {year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}); } catch { return ts; } }

  fetch('/api/tweets?user=WIPE_it_UP', { cache: 'no-store' })
    .then(r => { if(!r.ok) throw new Error('Failed to load tweets'); return r.json(); })
    .then(data => {
      feed.innerHTML = (data.tweets || []).map(t=>{
        const mediaHTML = (t.media||[])
          .filter(m=>m.proxied)
          .map(m=>`<img src="${esc(m.proxied)}" alt="${esc(m.alt||'tweet media')}" loading="lazy">`)
          .join('');
        return `
          <article class="tweet">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
              <img src="${esc(data.user.profile_image)}" alt="${esc(data.user.username)}" width="32" height="32" style="border-radius:50%;">
              <strong>${esc(data.user.name)}</strong> <span style="opacity:.8">@${esc(data.user.username)}</span>
            </div>
            <div style="white-space:pre-wrap; line-height:1.4;">${esc(t.text)}</div>
            ${mediaHTML ? `<div class="tweet-media">${mediaHTML}</div>` : ''}
            <time datetime="${esc(t.created_at)}">${fmt(t.created_at)}</time>
          </article>
        `;
      }).join('') || '<div>No recent tweets.</div>';
    })
    .catch(e => { feed.textContent = 'Could not load tweets.'; console.warn(e); });
})();
