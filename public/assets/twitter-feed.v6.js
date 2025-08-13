/* public/assets/twitter-feed.v5.js */
(() => {
  const FEED_SEL = '#twitter-feed';
  const FEED_LIMIT = 5;

  const el = document.querySelector(FEED_SEL);
  if (!el) return;

  const esc = (s) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  // turn plain text into links: URLs, #tags, $tags, @users
  function linkify(text, entities = {}) {
    let out = esc(text);

    // Replace t.co -> expanded URLs if present
    if (entities.urls && Array.isArray(entities.urls)) {
      for (const u of entities.urls) {
        if (!u.url) continue;
        const find = esc(u.url);
        const to = esc(u.expanded_url || u.url);
        const disp = esc(u.display_url || u.expanded_url || u.url);
        out = out.replace(
          new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          `<a href="${to}" rel="noopener noreferrer" target="_blank">${disp}</a>`
        );
      }
    }

    // @mentions (Twitter may or may not include entities.mentions)
    out = out.replace(
      /(^|[^/\w])@([A-Za-z0-9_]{1,15})\b/g,
      (_, p, u) => `${p}<a href="https://x.com/${u}" target="_blank" rel="noopener noreferrer">@${u}</a>`
    );

    // #hashtags
    out = out.replace(
      /(^|[^/\w])#([A-Za-z0-9_]+)\b/g,
      (_, p, tag) =>
        `${p}<a href="https://x.com/hashtag/${encodeURIComponent(tag)}" target="_blank" rel="noopener noreferrer">#${tag}</a>`
    );

    // $cashtags (crypto style)
    out = out.replace(
      /(^|[^/\w])\$(\w+)\b/g,
      (_, p, t) =>
        `${p}<a href="https://x.com/search?q=%24${encodeURIComponent(t)}&src=cashtag_click" target="_blank" rel="noopener noreferrer">$${t}</a>`
    );

    return out;
  }

  function timeAgo(iso) {
    try {
      const d = new Date(iso);
      const diff = (Date.now() - d.getTime()) / 1000;
      if (diff < 60) return `${Math.floor(diff)}s`;
      if (diff < 3600) return `${Math.floor(diff / 60)}m`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
      return d.toLocaleString();
    } catch {
      return iso;
    }
  }

  function renderTweet(t, usersById, mediaByKey) {
    const user = usersById[t.author_id] || {};
    const txt = linkify(t.text || '', t.entities);
    const when = timeAgo(t.created_at);
    const metrics = t.public_metrics || {};
    const urlToTweet = `https://x.com/${user.username || 'i'}/status/${t.id}`;

    // First photo (if any)
    let mediaHTML = '';
    if (t.attachments && Array.isArray(t.attachments.media_keys)) {
      const photo = t.attachments.media_keys
        .map((k) => mediaByKey[k])
        .find((m) => m && m.type === 'photo' && m.url);
      if (photo) {
        const src = photo.url;
        mediaHTML = `
          <a class="tw-media" href="${urlToTweet}" target="_blank" rel="noopener noreferrer">
            <img loading="lazy" src="${src}" alt="Tweet media">
          </a>`;
      }
    }

    return `
      <article class="tweet">
        <header class="tweet-hd">
          <div class="tweet-user">
            <div class="tweet-name">${esc(user.name || '')}</div>
            <div class="tweet-handle">@${esc(user.username || '')}</div>
          </div>
          <a class="tweet-time" href="${urlToTweet}" target="_blank" rel="noopener noreferrer">${when}</a>
        </header>
        <div class="tweet-text">${txt}</div>
        ${mediaHTML}
        <footer class="tweet-ft">
          <a href="${urlToTweet}" target="_blank" rel="noopener noreferrer" class="tweet-open">Open on X</a>
          <div class="tweet-metrics">
            <span>❤ ${metrics.like_count ?? 0}</span>
            <span>↩︎ ${metrics.reply_count ?? 0}</span>
            <span>🔁 ${metrics.retweet_count ?? 0}</span>
          </div>
        </footer>
      </article>
    `;
  }

  async function load() {
    try {
      const r = await fetch('/api/twitter-media', { credentials: 'same-origin' });
      if (!r.ok) throw new Error('feed fetch failed');
      const j = await r.json();

      const usersById = {};
      const mediaByKey = {};

      (j.includes?.users || []).forEach((u) => (usersById[u.id] = u));
      (j.includes?.media || []).forEach((m) => (mediaByKey[m.media_key] = m));

      const tweets = (j.data || []).slice(0, FEED_LIMIT);

      if (!tweets.length) {
        el.innerHTML = `<div class="tweet-empty">No tweets yet.</div>`;
        return;
      }

      el.innerHTML =
        `<div class="tweet-list">` +
        tweets.map((t) => renderTweet(t, usersById, mediaByKey)).join('') +
        `</div>`;
    } catch (e) {
      console.error(e);
      el.innerHTML = `<div class="tweet-error">Couldn’t load tweets right now.</div>`;
    }
  }

  // minimal styles (scoped to #twitter-feed)
  const css = `
  #twitter-feed { text-align:left; }
  #twitter-feed .tweet-list { display:grid; gap:14px; }
  #twitter-feed .tweet {
    background: rgba(8,20,38,.7);
    border:1px solid rgba(255,255,255,.08);
    border-radius:14px; padding:14px; color:#e9f0f7;
  }
  #twitter-feed a { color:#F6C445; text-decoration:none; }
  #twitter-feed a:hover { text-decoration:underline; }
  #twitter-feed .tweet-hd { display:flex; justify-content:space-between; align-items:baseline; gap:10px; margin-bottom:6px; }
  #twitter-feed .tweet-name { font-weight:700; }
  #twitter-feed .tweet-handle { opacity:.8; font-size:.9em; }
  #twitter-feed .tweet-time { opacity:.75; font-size:.85em; }
  #twitter-feed .tweet-text { line-height:1.35; margin:6px 0 8px; word-wrap:anywhere; }
  #twitter-feed .tw-media img { width:100%; height:auto; border-radius:10px; display:block; margin-top:8px; }
  #twitter-feed .tweet-ft { display:flex; justify-content:space-between; align-items:center; margin-top:8px; font-size:.9em; opacity:.9;}
  #twitter-feed .tweet-metrics { display:flex; gap:12px; }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  load();
})();
