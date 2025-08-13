// Cached Twitter feed via user ID (no username lookup).
// Serves fresh data when possible, falls back to cached JSON on 429/errors.

let CACHE = { json: null, ts: 0 };       // module-scoped cache (persists while function is warm)
const FRESH_MS = 10 * 60 * 1000;         // 10 minutes: serve from cache if still fresh
const STALE_OK_MS = 24 * 60 * 60 * 1000; // 24 hours: OK to serve stale on errors

export default async function handler(req, res) {
  const bearer = process.env.TWITTER_BEARER_TOKEN;
  const userId = process.env.TWITTER_USER_ID; // your numeric id_str
  if (!bearer || !userId) {
    return res.status(500).json({ error: 'Missing TWITTER_BEARER_TOKEN or TWITTER_USER_ID' });
  }

  const now = Date.now();
  const isFresh = now - CACHE.ts < FRESH_MS;
  const wantsRefresh = 'refresh' in req.query;

  // Serve fresh cache immediately (unless ?refresh=1)
  if (!wantsRefresh && CACHE.json && isFresh) {
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=60');
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(CACHE.json);
  }

  try {
    const params = new URLSearchParams({
      max_results: '5',
      // lean fields to reduce cost/size
      'tweet.fields': 'created_at,public_metrics,entities,attachments',
      expansions: 'attachments.media_keys,author_id',
      'media.fields': 'url,preview_image_url,alt_text'
    });

    const resp = await fetch(
      `https://api.twitter.com/2/users/${userId}/tweets?${params.toString()}`,
      { headers: { Authorization: `Bearer ${bearer}` } }
    );

    if (!resp.ok) {
      // If rate limited or other error, try to serve stale cache
      const detail = await resp.text().catch(() => '');
      if (CACHE.json && now - CACHE.ts < STALE_OK_MS) {
        res.setHeader('Cache-Control', 's-maxage=60'); // tiny edge cache when serving stale
        res.setHeader('X-Cache', 'STALE');
        return res.status(200).json(CACHE.json);
      }
      return res.status(resp.status).json({ error: 'Tweets fetch failed', detail });
    }

    const json = await resp.json();

    // Save to in-memory cache
    CACHE = { json, ts: Date.now() };

    // Edge cache for 10 minutes; browsers can revalidate
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=60');
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json(json);
  } catch (e) {
    // On any exception, serve stale if we have it
    if (CACHE.json && now - CACHE.ts < STALE_OK_MS) {
      res.setHeader('Cache-Control', 's-maxage=60');
      res.setHeader('X-Cache', 'STALE-ERROR');
      return res.status(200).json(CACHE.json);
    }
    return res.status(500).json({ error: 'Unhandled server error', detail: String(e) });
  }
}
