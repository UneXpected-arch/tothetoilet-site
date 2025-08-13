// /public/assets/twitter-feed.js
document.addEventListener('DOMContentLoaded', loadTweets);

async function loadTweets() {
  const box = document.getElementById('tweets');
  if (!box) return;

  try {
    const res = await fetch('/api/twitter-media'); // served from your Redis cache
    const data = await res.json();

    const tweets = data?.data || [];
    const includes = data?.includes || {};
    const mediaArr = includes.media || [];
    const usersArr = includes.users || [];

    // Build lookup maps
    const mediaByKey = Object.fromEntries(mediaArr.map(m => [m.media_key, m]));
    const user = usersArr[0]; // your account

    if (!tweets.length) {
      box.textContent = 'No tweets yet.';
      return;
    }

    box.innerHTML = tweets.map(t => renderTweet(t, user, mediaByKey)).join('');
  } catch (e) {
    console.error(e);
    document.getElementById('tweets').textContent = 'Tweets temporarily unavailable.';
  }
}

function renderTweet(t, user, mediaByKey) {
  const textHtml = linkify((t.text || '').replace(/</g, '&lt;'), t.entities);
  const when = new Date(t.created_at).toLocaleString();
  const metrics = t.public_metrics || {};
  const tweetUrl = `https://x.com/${user?.username || 'x'}/status/${t.id}`;

  // Media (photo/preview_image)
  let mediaHtml = '';
  const keys = t.attachments?.media_keys || [];
  if (keys.length) {
    mediaHtml = keys.map(k => {
      const m = mediaByKey[k];
      if (!m) return '';
      const src = m.url || m.preview_image_url;
      return src ? `<img src="${src}" alt="${escapeAttr(m.alt_text || 'Tweet media')}" style="width:100%;border-radius:10px;margin-top:8px;">` : '';
    }).join('');
  }

  return `
    <article class="tweet">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
        ${user?.profile_image_url ? `<img src="${user.profile_image_url}" alt="${escapeAttr(user.name || 'User')}" width="28" height="28" style="border-radius:50%;">` : ''}
        <div style="font-weight:600;">${escapeHtml(user?.name || '')} <span style="opacity:.7;">@${escapeHtml(user?.username || '')}</span></div>
      </div>

      <p style="line-height:1.45;">${textHtml}</p>
      ${mediaHtml}

      <div style="display:flex;gap:14px;opacity:.8;margin-top:8px;font-size:12px;">
        <time datetime="${new Date(t.created_at).toISOString()}">${when}</time>
        <span>❤ ${fmt(metrics.like_count)}</span>
        <span>🔁 ${fmt(metrics.retweet_count)}</span>
        <span>💬 ${fmt(metrics.reply_count)}</span>
        <a href="${tweetUrl}" target="_blank" rel="noopener" style="margin-left:auto;">View on X ↗</a>
      </div>
    </article>
  `;
}

// Turn URLs/hashtags/mentions into links using entities
function linkify(text, entities) {
  if (!entities) return text;
  // Replace from end to start so indices remain valid
  const repls = [];
  (entities.urls || []).forEach(u => {
    repls.push([u.start, u.end, `<a href="${u.expanded_url || u.url}" target="_blank" rel="noopener">${escapeHtml(u.display_url || u.url)}</a>`]);
  });
  (entities.hashtags || []).forEach(h => {
    const tag = h.tag;
    repls.push([h.start, h.end, `<a href="https://x.com/hashtag/${encodeURIComponent(tag)}" target="_blank" rel="noopener">#${escapeHtml(tag)}</a>`]);
  });
  (entities.mentions || []).forEach(m => {
    const u = m.username;
    repls.push([m.start, m.end, `<a href="https://x.com/${encodeURIComponent(u)}" target="_blank" rel="noopener">@${escapeHtml(u)}</a>`]);
  });

  repls.sort((a,b) => b[0]-a[0]); // descending by start
  let s = text;
  for (const [start, end, html] of repls) {
    s = s.slice(0, start) + html + s.slice(end);
  }
  return s;
}

function fmt(n){ return typeof n === 'number' ? n.toLocaleString() : '0'; }
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function escapeAttr(s){ return escapeHtml(s).replace(/"/g,'&quot;'); }
