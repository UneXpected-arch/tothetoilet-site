(async () => {
  const box = document.getElementById('twitter-feed');
  if (!box) return;

  function h(t){ return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function ago(iso){
    const d = (Date.now() - new Date(iso).getTime())/1000;
    if (d<60) return `${Math.floor(d)}s`; if (d<3600) return `${Math.floor(d/60)}m`;
    if (d<86400) return `${Math.floor(d/3600)}h`; return `${Math.floor(d/86400)}d`;
  }

  box.innerHTML = '<div style="opacity:.7">Loading tweets…</div>';

  try {
    const res = await fetch(`/api/twitter-media?_=${Date.now()}`, { cache: 'no-store', credentials: 'omit' });
    if (!res.ok) throw new Error('HTTP '+res.status);
    const json = await res.json();
    const tweets = (json && json.data) || [];
    const users = (json && json.includes && json.includes.users) || [];
    const media = (json && json.includes && json.includes.media) || [];
    const user = users[0];

    if (!tweets.length) { box.textContent = 'No tweets yet.'; return; }

    box.innerHTML = tweets.map(t => {
      let img = '';
      if (t.attachments && t.attachments.media_keys) {
        const m = media.find(m => m.media_key === t.attachments.media_keys[0]);
        if (m && m.url) img = `<div style="margin-top:10px"><img src="${m.url}" alt="" style="max-width:100%;border-radius:10px;"></div>`;
      }
      return `
      <article style="text-align:left;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:14px 16px;margin:10px 0">
        ${user ? `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <img src="${h(user.profile_image_url||'')}" alt="" width="32" height="32" style="border-radius:50%">
          <div><strong>@${h(user.username)}</strong> · <span style="opacity:.7">${ago(t.created_at)}</span></div>
        </div>` : ''}
        <div style="white-space:pre-wrap;line-height:1.4">${h(t.text)}</div>
        ${img}
      </article>`;
    }).join('');
  } catch (e) {
    box.innerHTML = `<div style="opacity:.75;color:#f6c445">Could not load tweets.</div>`;
    console.error('twitter feed error', e);
  }
})();
