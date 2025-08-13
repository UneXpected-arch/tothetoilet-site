// /public/assets/twitter-feed.js
// Fetches from /api/twitter-media (cached via Redis) and renders tweets
// - Linkifies URLs, hashtags, mentions via entities
// - Shows attached images/GIF previews
// - Displays like/retweet/reply counts + time
// - CSP-safe (no inline/eval)

document.addEventListener('DOMContentLoaded', async () => {
  const list = document.getElementById('tweet-list');
  const wrap = document.getElementById('tweets');
  if (!list) return;

  // Skeleton while loading
  list.innerHTML = `
    <div class="tweet"><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line short"></div></div>
    <div class="tweet"><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line short"></div></div>
  `;

  try {
    const res = await fetch('/api/twitter-media', { credentials: 'omit' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const tweets = data?.data || [];
    const includes = data?.includes || {};
    const mediaArr = includes.media || [];
    const usersArr = includes.users || [];
    const user = usersArr[0] || null;

    const mediaByKey = Object.fromEntries(mediaArr.map(m => [m.media_key, m]));

    if (!tweets.length) {
      list.innerHTML = '<div class="tweet">No tweets yet.</div>';
      return;
    }

    list.innerHTML = tweets.map(t => renderTweet(t, user, mediaByKey)).join('');
  } catch (err) {
    console.error('Tweet feed error:', err);
    if (wrap) wrap.style.opacity = '0.9';
    list.innerHTML = '<div class="tweet">Tweets temporarily unavailable.</div>';
  }
});

function renderTweet(t, user, mediaByKey) {
  const textRaw = t?.text || '';
  const textHtml = linkify(escapeHtml(textRaw), t?.entities);
  const when = formatWhen(t?.created_at);
  const m = t?.public_metrics || {};
  const tweetUrl = user ? `https://x.com/${encodeURIComponent(user.username)}/status/${t.id}` : '#';

  // Media block
  let mediaHtml = '';
  const keys = t?.attachments?.media_keys || [];
  if (keys.length) {
    mediaHtml = keys.map(k => {
      const med = mediaByKey[k];
      if (!med) return '';
      const src = med.url || med.preview_image_url;
      if (!src) return '';
      return `<img class="tweet-media" src="${src}" alt="${escapeAttr(med.alt_text || 'Tweet media')}">`;
    }).join('');
  }

  const avatar = user?.profile_image_url
    ? `<img class="tweet-avatar" src="${user.profile_image_url}" alt="${escapeAttr(user.name || 'User')}">`
    : '';

  return `
<article class="tweet">
  <header class="tweet-head">
    ${avatar}
    <div class="tweet-identity">
      <div class="tweet-name">${escapeHtml(user?.name || '')}</div>
      <div class="tweet-handle">@${escapeHtml(user?.username || '')}</div>
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

// Linkify using entity indices (works on already-escaped text)
function linkify(escaped, entities) {
  if (!entities) return escaped;
  const reps = [];

  (entities.urls || []).forEach(u => {
    const href = u.expanded_url || u.url;
    const label = escapeHtml(u.display_url || u.url);
    reps.push([u.start, u.end, `<a href="${href}" target="_blank" rel="noopener">${label}</a>`]);
  });

  (entities.hashtags || []).forEach(h => {
    const tag = h.tag;
    const href = `https://x.com/hashtag/${encodeURIComponent(tag)}`;
    reps.push([h.start, h.end, `<a href="${href}" target="_blank" rel="noopener">#${escapeHtml(tag)}</a>`]);
  });

  (entities.mentions || []).forEach(m => {
    const uname = m.username;
    const href = `https://x.com/${encodeURIComponent(uname)}`;
    reps.push([m.start, m.end, `<a href="${href}" target="_blank" rel="noopener">@${escapeHtml(uname)}</a>`]);
  });

  reps.sort((a,b)=>b[0]-a[0]); // apply from end
  let s = escaped;
  for (const [start, end, frag] of reps) {
    s = s.slice(0, start) + frag + s.slice(end);
  }
  return s;
}

function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, c => (
    { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]
  ));
}
function escapeAttr(s){ return escapeHtml(s).replace(/"/g, '&quot;'); }
function fmt(n){ return typeof n === 'number' ? n.toLocaleString() : '0'; }
function formatWhen(iso){
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit' });
}
