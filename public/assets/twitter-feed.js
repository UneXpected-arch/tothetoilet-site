fetch('/api/twitter-media?user=WIPE_it_UP', { cache: 'no-store' })
  .then(r => r.json())
  .then(data => {
    const el = document.getElementById('tweets');
    if (!data?.data) {
      el.textContent = data?.error ? `Tweets unavailable: ${data.error}` : 'No tweets.';
      return;
    }
    el.innerHTML = data.data.map(t => `
      <div class="tweet">
        <p>${t.text.replace(/</g,'&lt;')}</p>
        <time>${new Date(t.created_at).toLocaleString()}</time>
      </div>
    `).join('');
  })
  .catch(() => (document.getElementById('tweets').textContent = 'Could not load tweets.'));

