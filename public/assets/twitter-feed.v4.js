export default async function handler(req, res) {
  const token = process.env.TWITTER_BEARER_TOKEN;
  const userId = process.env.TWITTER_USER_ID;

  // Hard no-cache everywhere
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  res.setHeader('Surrogate-Control', 'no-store');

  if (!token || !userId) {
    return res.status(500).json({ error: 'Missing TWITTER_BEARER_TOKEN or TWITTER_USER_ID' });
  }

  try {
    const url = new URL(`https://api.twitter.com/2/users/${userId}/tweets`);
    url.search = new URLSearchParams({
      max_results: '5',
      'tweet.fields': 'created_at,public_metrics,entities,attachments',
      expansions: 'attachments.media_keys,author_id',
      'media.fields': 'url,preview_image_url,alt_text',
      'user.fields': 'name,username,profile_image_url'
    });

    const upstream = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const text = await upstream.text(); // avoid body reuse/etag surprises
    return res.status(upstream.status).type('application/json').send(text);
  } catch (e) {
    return res.status(500).json({ error: 'Server error', detail: String(e) });
  }
}
