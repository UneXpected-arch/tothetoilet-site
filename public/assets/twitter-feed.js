/* twitter-feed v6 – renders links, #hashtags, @mentions, $cashtags + media
   expects GET /api/twitter-media to return { data, includes } from X API  */
(async () => {
  const box = document.getElementById('twitter-feed');
  if (!box) return;

  const safe = s =>
    s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  const autolink = (text, entities={}) => {
    let html = safe(text);

    // 1) raw URLs first
    if (entities.urls) {
      [...entities.urls].sort((a,b)=>b.start-a.start).forEach(u => {
        const url = u.expanded_url || u.url;
        const disp = (u.display_url || url).replace(/^https?:\/\//,'');
        html =
          html.slice(0,u.start) +
          `<a href="${url}" class="tw-url" target="_blank" rel="noopener noreferrer">${safe(disp)}</a>` +
          html.slice(u.end);
      });
    }

    // 2) hashtags
    if (entities.hashtags) {
      entities.hashtags.forEach(h => {
        const tag = h.tag;
        html = html.replace(new RegExp(`(^|[^\\w])#${tag}(?![\\w])`,'g'),
          `$1<a class="tw-hashtag" href="https://x.com/hashtag/${encodeURIComponent(tag)}" target="_blank" rel="noopener noreferrer">#${safe(tag)}</a>`);
      });
    }

    // 3) mentions — do a lightweight parse so we don’t need the users entity
    html = html.replace(/(^|[^/\w])@([A-Za-z0-9_]{1,15})(?![A-Za-z0-9_])/g,
      `$1<a class="tw-mention" href="https://x.com/$2" target="_blank" rel="noopener noreferrer">@$2</a>`);

    // 4) cashtags
    if (entities.cashtags) {
      entities.cashtags.forEach(c => {
        const tag = c.tag;
        html = html.replace(new RegExp(`\\$${tag}(?![A-Za-z0-9_])`,'g'),
          `<a class="tw-cashtag" href="https://x.com/search?q=%24${encodeURIComponent(tag)}" target="_blank" rel="noopener noreferrer">$${safe(tag)}</a>`);
      });
    }

    return html;
  };

  const pickMedia = (includes, keys) => {
    if (!includes || !includes.media || !keys) return null;
    const set = new Map(includes.media.map(m => [m.media_key, m]));
    for (const k of keys) {
      const m = set.get(k);
      if (m && (m.type === 'photo' || m.url)) return m.url || null;
    }
    return null;
  };

  const render = (tweet, includes) => {
    const mediaUrl = pickMedia(includes, tweet.attachments?.media_keys);
    const time = new Date(tweet.created_at);
    const when = time.toLocaleString(undefined, { dateStyle:'short', timeStyle:'short' });

    return `
      <article class="tweet">
        ${mediaUrl ? `<img class="tweet-media" src="${mediaUrl}" alt="tweet media" loading="lazy">` : ''}
        <div class="tweet-body">
          <div class="tweet-text">${autolink(tweet.text, tweet.entities)}</div>
          <div class="tweet-meta">
            <a href="https://x.com/${includes?.users?.[0]?.username || 'WIPE_it_UP'}/status/${tweet.id}"
               target="_blank" rel="noopener noreferrer">${when}</a>
          </div>
        </div>
      </article>
    `;
  };

  try {
    const res = await fetch('/api/twitter-media', { credentials:'omit', cache:'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const tweets = json.data || [];
    const inc = json.includes || {};

    if (!tweets.length) {
      box.innerHTML = `<div class="tweet-empty">No tweets yet.</div>`;
      return;
    }

    box.innerHTML = `
      <style>
        #twitter-feed{display:flex;flex-direction:column;gap:14px}
        .tweet{display:flex;gap:12px;align-items:flex-start;background:rgba(255,255,255,.06);
               border:1px solid rgba(255,255,255,.12); border-radius:14px; padding:14px}
        .tweet-media{width:84px; height:84px; object-fit:cover; border-radius:10px; flex:0 0 auto;
                     box-shadow:0 0 12px rgba(246,196,69,.35)}
        .tweet-body{min-width:0}
        .tweet-text{line-height:1.45}
        .tweet a{color:#F6C445; text-decoration:none}
        .tweet a:hover{text-decoration:underline}
        .tweet-meta{opacity:.85; font-size:12px; margin-top:6px}
        .tweet-empty{opacity:.85}
        @media (max-width:480px){ .tweet-media{width:72px;height:72px} }
      </style>
      ${tweets.map(t => render(t, inc)).join('')}
    `;
  } catch (e) {
    console.error('tweet feed error', e);
    box.innerHTML = `<div class="tweet-empty">Couldn’t load tweets.</div>`;
  }
})();
