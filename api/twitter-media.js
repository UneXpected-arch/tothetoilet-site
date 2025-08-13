import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const CACHE_KEY = 'tweets:WIPE_it_UP'; // change if your handle changes
const TTL_SECONDS = 600;               // 10 minutes

export default async function handler(req, res) {
  const bearer = process.env.TWITTER_BEARER_TOKEN;
  const userId = process.env.TWITTER_USER_ID;
  if (!bearer || !userId) {
    return res.status(500).json({ error: 'Missing TWITTER_BEARER_TOKEN or TWITTER_USER_ID' });
  }

  try {
    // 1) Try Redis cache first
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
      res.setHeader('X-Cache', 'REDIS-HIT');
      return res.status(200).json(cached);
    }

    // 2) Fetch from X API using user ID (no username lookup)
    const params = new URLSearchParams({
      max_results: '5',
      'tweet.fields': 'created_at,public_metrics,entities,attachments',
      expansions: 'attachments.media_keys,author_id',
      'media.fields': 'url,preview_image_url,alt_text'
    });

    const url = `https://api.twitter.com/2/users/${userId}/tweets?${params.toString()}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${bearer}` } });

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      // Fallback to any stale cache
      const stale = await redis.get(CACHE_KEY);
      if (stale) {
        res.setHeader('Cache-Control', 's-maxage=60');
        res.setHeader('X-Cache', 'REDIS-STALE');
        return res.status(200).json(stale);
      }
      return res.status(r.status).json({ error: 'Tweets fetch failed', detail });
    }

    const json = await r.json();

    // 3) Save to Redis with TTL
    await redis.set(CACHE_KEY, json, { ex: TTL_SECONDS });

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    res.setHeader('X-Cache', 'MISS-FETCHED');
    return res.status(200).json(json);
  } catch (e) {
    return res.status(500).json({ error: 'Unhandled server error', detail: String(e) });
  }
}
