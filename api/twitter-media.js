// api/twitter-media.js
export default async function handler(req, res) {
  const token = process.env.TWITTER_BEARER_TOKEN;
  const userId = process.env.TWITTER_USER_ID;

  if (!token || !userId) {
    // never cache errors either
    res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');
res.setHeader('Pragma','no-cache');
res.setHeader('Expires','0');
res.setHeader('Surrogate-Control','no-store');
res.setHeader('CDN-Cache-Control','no-store');
res.setHeader('Vercel-CDN-Cache-Control','no-store');

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res.status(500).json({ error: 'Missing TWITTER_BEARER_TOKEN or TWITTER_USER_ID' });
  }

  try {
    const url = new URL(`https://api.twitter.com/2/users/${userId}/tweets`);
    url.search = new URLSearchParams({
      max_results: '5',
      'tweet.fields': 'created_at,public_metrics,entities,attachments',
      expansions: 'attachments.media_keys,author_id',
      'media.fields': 'url,preview_image_url,alt_text',
      // 👇 ensures avatar comes back
      'user.fields': 'name,username,profile_image_url',
    });

    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    // prevent Vercel/CDN/browser caching regardless of status
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    // extra hints for Vercel’s edge cache
    res.setHeader('CDN-Cache-Control', 'no-store');
    res.setHeader('Vercel-CDN-Cache-Control', 'no-store');

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      return res.status(resp.status).json({ error: 'Tweets fetch failed', detail });
    }

    const data = await resp.json();
    return res.status(200).json(data);
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
}
