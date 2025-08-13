document.addEventListener('DOMContentLoaded', async () => {
  const el = document.getElementById('tweets');
  if (!el) return;
  try {
    const res = await fetch('/api/twitter-media'); // let caches work
    const data = await res.json();

    if (!data?.data?.length) {
      el.textContent = 'No tweets yet.';
      return;
    }

    el.innerHTML = data.data.map(t => `
      <div class="tweet">
        <p>${(t.text || '').replace(/</g,'&lt;')}</p>
        <time>${new Date(t.created_at).toLocaleString()}</time>
      </div>
    `).join('');
  } catch {
    el.textContent = 'Tweets temporarily unavailable.';
  }
});
