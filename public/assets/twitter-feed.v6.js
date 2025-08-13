// public/assets/twitter-feed.v6.js
(() => {
  const FEED = document.getElementById('twitter-feed');
  if (!FEED) return;

  // Minimal styles for cards/media/links (inline CSS is allowed by your CSP)
  if (!document.getElementById('tf-style')) {
    const s = document.createElement('style');
    s.id = 'tf-style';
    s.textContent = `
      #twitter-feed { display: grid; gap: 14px; }
      .tweet {
        text-align: left;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 12px;
        padding: 14px 14px 12px;
      }
      .tweet-header {
        font-weight: 700;
        margin-bottom: 6px;
        opacity: .9;
      }
      .tweet-time { opacity: .7; font-weight: 500; }
      .tweet-text { margin: 6px 0 8px; line-height: 1.5; }
      .tweet a { color: var(--gold, #F6C445); text-decoration: underline; }
      img.tweet-media {
        display: block; width: 100%; height: auto;
        border-radius: 10px; margin-top: 10px;
      }
    `;
    document.head.appendChild(s);
  }

  // Build a map for media lookup
  function buildMediaMap(json) {
    const map = new Map();
    const media = (json.includes && json.includes.media) || [];
    media.forEach(m => map.set(m.media_key, m));
    return map;
  }

  // Escape plain text
  const esc = (s) => s.replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  // Turn entities into DOM safely (URLs, hashtags, cashtags)
  function linkify(text, entities = {}) {
    const ranges = [];
    (entities.urls || []).forEach(u => ranges.push({ start: u.start, end: u.end, kind: 'url', u }));
    (entities.hashtags || []).forEach(h => ranges.push({ start: h.start, end: h.end, kind: 'hashtag', h }));
    (entities.cashtags || []).forEach(c => ranges.push({ start: c.start, end: c.end, kind: 'cashtag', c }));
    (entities.mentions || []).forEach(m => ranges.push({ start: m.start, end: m.end, kind: 'mention', m }));

    ranges.sort((a, b) => a.start - b.start);

    const frag = document.createDocumentFragment();
    let pos = 0;

    const pushText = (str) => frag.appendChild(document.createTextNode(str));

    ranges.forEach(r => {
      if (r.start > pos) pushText(text.slice(pos, r.start));

      if (r.kind === 'url') {
        const a = document.createElement('a');
        a.href = r.u.expanded_url || r.u.unwound_url || r.u.url;
        a.textContent = r.u.display_url || (r.u.expanded_url || r.u.url).replace(/^https?:\/\//, '');
        a.target = '_blank';
        a.rel = 'noopener noreferrer nofollow';
        frag.appendChild(a);
      } else if (r.kind === 'hashtag') {
        const tag = r.h.tag;
        const a = document.createElement('a');
        a.href = `https://x.com/hashtag/${encodeURIComponent(tag)}?src=hashtag_click`;
        a.textContent = `#${tag}`;
        a.target = '_blank';
        a.rel = 'noopener noreferrer nofollow';
        frag.appendChild(a);
      } else if (r.kind === 'cashtag') {
        const tag = r.c.tag;
        const a = document.createElement('a');
        a.href = `https://x.com/search?q=%24${encodeURIComponent(tag)}&src=cashtag_click`;
        a.textContent = `$${tag}`;
        a.target = '_blank';
        a.rel = 'noopener noreferrer nofollow';
        frag.appendChild(a);
      } else if (r.kind === 'mention') {
        const u = r.m.username;
        const a = document.createElement('a');
        a.href = `https://x.com/${encodeURIComponent(u)}`;
        a.textContent = `@${u}`;
        a.target = '_blank';
        a.rel = 'noopener noreferrer nofollow';
        frag.appendChild(a);
      }

      pos = r.end;
    });

    if (pos < text.length) pushText(text.slice(pos));
    return frag;
  }

  function renderTweets(json) {
    FEED.innerHTML = '';
    const users = (json.includes && json.includes.users) || [];
    const byId = Object.fromEntries(users.map(u => [u.id, u]));
    const mMap = buildMediaMap(json);

    (json.data || []).forEach(t => {
      const u = byId[t.author_id] || {};
      const card = document.createElement('article');
      card.className = 'tweet';

      // Header: Name @user • time
      const h = document.createElement('div');
      h.className = 'tweet-header';
      const when = new Date(t.created_at);
      const time = document.createElement('span');
      time.className = 'tweet-time';
      time.textContent = ` • ${when.toLocaleString()}`;
      h.appendChild(document.createTextNode(`${u.name || ''}${u.username ? ' @' + u.username : ''}`));
      h.appendChild(time);
      card.appendChild(h);

      // Text with links
      const p = document.createElement('div');
      p.className = 'tweet-text';
      p.appendChild(linkify(t.text || '', t.entities));
      card.appendChild(p);

      // Photos
      const keys = (t.attachments && t.attachments.media_keys) || [];
      keys.forEach(k => {
        const m = mMap.get(k);
        if (!m) return;
        if (m.type === 'photo' && m.url) {
          const img = document.createElement('img');
          img.className = 'tweet-media';
          img.src = m.url;             // allowed by CSP: pbs.twimg.com
          img.alt = 'Tweet image';
          img.loading = 'lazy';
          card.appendChild(img);
        }
        // videos/animated_gif can be linked to the tweet if needed
      });

      FEED.appendChild(card);
    });
  }

  function fetchTweets() {
    fetch(`/api/twitter-media?_=${Date.now()}`, { cache: 'no-store', credentials: 'omit' })
      .then(r => r.json())
      .then(j => renderTweets(j))
      .catch(err => {
        FEED.textContent = 'Could not load tweets.';
        console.error('Twitter feed error', err);
      });
  }

  // expose for manual refresh if needed
  window.renderTweets = renderTweets;

  fetchTweets();
  // Optional: refresh every minute
  setInterval(fetchTweets, 60000);
})();
