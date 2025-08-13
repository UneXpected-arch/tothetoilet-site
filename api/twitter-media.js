// /api/twitter-media.js  (Vercel serverless function)
export default async function handler(req, res) {
  const bearer = process.env.TWITTER_BEARER_TOKEN;
  const userId = process.env.TWITTER_USER_ID; // <- your id_str here via env
  if (!bearer || !userId) {
    return res.status(500).json({ error: 'Missing TWITTER_BEARER_TOKEN or TWITTER_USER_ID' });
  }

  try {
    const params = new URLSearchParams({
      max_results: '5',
      'tweet.fields': 'created_at,public_metrics,entities,attachments,source',
      expansions: 'attachments.media_keys,author_id',
      'media.fields': 'url,preview_image_url,alt_text'
    });

    const tweetsRes = await fetch(
      `https://api.twitter.com/2/users/${userId}/tweets?${params.toString()}`,
      { headers: { Authorization: `Bearer ${bearer}` } }
    );

    if (!tweetsRes.ok) {
      const txt = await tweetsRes.text().catch(() => '');
      return res.status(tweetsRes.status).json({ error: 'Tweets fetch failed', detail: txt });
    }

    const tweetsJson = await tweetsRes.json();

    // Edge cache to avoid 429s (10 min)
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=60');
    return res.status(200).json(tweetsJson);
  } catch (e) {
    return res.status(500).json({ error: 'Unhandled server error', detail: String(e) });
  }
}
