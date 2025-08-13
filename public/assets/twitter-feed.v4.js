// Force-fresh, CSP-safe tweet renderer
document.addEventListener('DOMContentLoaded', initTweets);

async function initTweets() {
  const mount = document.getElementById('tweet-list') || document.getElementById('twitter-feed');
  if (!mount) return;

  mount.innerHTML = `
    <div class="tweet"><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line short"></div></div>
    <div class="tweet"><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line short"></div></div>
  `;

  try {
    const res = await fetch(`/api/twitter-media?_=${Date.now()}`, { cache: 'no-store', credentials: 'omit' });
    if (!res.ok) {
      const text = await res.text().catch(()=>'');
      console.warn('tweet feed HTTP error', res.status, text);
      mount.innerHTML = `<div class="tweet">Tweets temporarily unavailable. (${res.status})</div>`;
      return;
    }
    const json = await res.json();
    console.debug('tweet feed JSON:', json);

    const tweets = Array.isArray(json?.data) ? json.data : [];
    const includes = json?.includes || {};
    const mediaArr = includes.media || [];
    const usersArr = includes.users || [];

    const mediaByKey = Object.fromEntries(mediaArr.map(m => [m.media_key, m]));
    const authorsById = Object.fromEntries(usersArr.map(u => [u.id, u]));

    if (!tweets.length) {
      mount.innerHTML = `<div class="tweet">No tweets yet.</div>`;
      return;
    }

    mount.innerHTML = tweets.map(t => renderTweet(t, authorsById[t.author_id], mediaByKey)).join('');
  } catch (err) {
    console.error('tweet feed exception:', err);
    mount.innerHTML = `<div class="tweet">Tweets temporarily unavailable.</div>`;
  }
}

function renderTweet(t, user, mediaByKey) {
  const textHtml = linkify(esc(t?.text || ''), t?.entities);
  const when = formatWhen(t?.created_at);
  const m = t?.public_metrics || {};
  const tweetUrl = user ? `https://x.com/${encodeURIComponent(user.username)}/status/${t.id}` : '#';

  const avatar = user?.profile_image_url
    ? `<img class="tweet-avatar" src="${user.profile_image_url}" alt="${escAttr(user.name || 'User')}">`
    : '';

  let mediaHtml = '';
  const keys = t?.attachments?.media_keys || [];
  if (keys.length) {
    mediaHtml = keys.map(k => {
      const md = mediaByKey[k];
      const src = md?.url || md?.preview_image_url;
      if (!src) return '';
      return `<img class="tweet-media" src="${src}" alt="${escAttr(md?.alt_text || 'Tweet media')}">`;
    }).join('');
  }

  return `
<article class="tweet">
  <header class="tweet-head">
    ${avatar}
    <div class="tweet-identity">
      <div class="tweet-name">${esc(user?.name || '')}</div>
      <div class="tweet-handle">${user ? '@'+esc(user.username) : ''}</div>
    </div>
  </header>
  <div class="tweet-text">${textHtml}</div>
  ${mediaHtml}
  <footer class="tweet-meta">
    <time datetime="${t?.created_at ? new Date(t.created_at).toISOString() : ''}">${when}</time>
    <span>❤ ${fmt(m.like_count)}</span>
    <span>🔁 ${fmt(m.retweet_count)}</span>
    <span>💬 ${fmt(m.reply_count)}</span>
    <a class="tweet-link" href="${tweetUrl}" target="_blank" rel="noopener">View on X ↗</a>
  </footer>
</article>`.trim();
}

/* helpers */
function linkify(txt, entities) {
  if (!entities) return txt;
  const reps = [];
  (entities.urls || []).forEach(u => {
    const href = u.expanded_url || u.url;
    const label = esc(u.display_url || u.url);
    reps.push([u.start, u.end, `<a href="${href}" target="_blank" rel="noopener">${label}</a>`]);
  });
  (entities.hashtags || []).forEach(h => {
    const tag = esc(h.tag);
    reps.push([h.start, h.end, `<a href="https://x.com/hashtag/${encodeURIComponent(tag)}" target="_blank" rel="noopener">#${tag}</a>`]);
  });
  (entities.mentions || []).forEach(m => {
    const un = esc(m.username);
    reps.push([m.start, m.end, `<a href="https://x.com/${encodeURIComponent(un)}" target="_blank" rel="noopener">@${un}</a>`]);
  });
  reps.sort((a,b)=>b[0]-a[0]);
  for (const [s,e,frag] of reps) txt = txt.slice(0,s)+frag+txt.slice(e);
  return txt;
}
function esc(s){return (s||'').replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));}
function escAttr(s){return esc(s).replace(/"/g,'&quot;');}
function fmt(n){return typeof n==='number'? n.toLocaleString() : '0';}
function formatWhen(iso){ if(!iso) return ''; const d=new Date(iso); return d.toLocaleString(undefined,{year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'}); }
