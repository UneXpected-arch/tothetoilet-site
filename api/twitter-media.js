// /api/twitter-media.js
// Works on Vercel Node runtime. Caches aggressively to avoid 429.

const TW_BEARER = process.env.TWITTER_BEARER_TOKEN;
const TW_USER_ID = process.env.TWITTER_USER_ID; // numeric
const USE_KV = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

// Optional Upstash Redis (REST)
async function kvGet(key) {
  if (!USE_KV) return null;
  const url = `${process.env.UPSTASH_REDIS_REST_URL}/get/${encodeURIComponent(key)}`;
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
    cache: "no-store",
  });
  if (!r.ok) return null;
  const json = await r.json().catch(() => null);
  if (!json || json.result == null) return null;
  try { return JSON.parse(json.result); } catch { return null; }
}

async function kvSet(key, value, ttlSec) {
  if (!USE_KV) return;
  const url = `${process.env.UPSTASH_REDIS_REST_URL}/set/${encodeURIComponent(key)}`;
  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ value: JSON.stringify(value), ex: ttlSec }),
  }).catch(() => {});
}

const KV_KEY = "twitter_media_v1";
const TTL = 300; // 5 minutes
const MAX_TWEETS = 3;

export default async function handler(req, res) {
  try {
    if (!TW_BEARER || !TW_USER_ID) {
      res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60");
      return res.status(500).json({ error: "Missing TWITTER_BEARER_TOKEN or TWITTER_USER_ID" });
    }

    // Try CDN/Edge revalidation first
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=86400");

    // 1) Try KV cache
    const cached = await kvGet(KV_KEY);
    // 2) Fetch fresh in parallel (but we’ll fall back to cached on rate limit)
    let fresh;
    try {
      const url = new URL("https://api.x.com/2/users/" + TW_USER_ID + "/tweets");
      url.searchParams.set("max_results", String(MAX_TWEETS));
      url.searchParams.set("expansions", "attachments.media_keys,author_id");
      url.searchParams.set("tweet.fields", "created_at,public_metrics,entities,attachments");
      url.searchParams.set("media.fields", "url,preview_image_url,type");
      url.searchParams.set("user.fields", "name,username,profile_image_url");

      const r = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${TW_BEARER}` },
        // Avoid browser/X caching — we want to control via CDN/KV
        cache: "no-store",
      });

      if (r.status === 429 || r.status >= 500) {
        // Rate limited or server error: serve cache if available
        if (cached) return res.status(200).json({ ...cached, cached: true });
        // no cache -> return a minimal error
        return res.status(r.status).json({ error: "Upstream rate-limited", status: r.status });
      }

      if (!r.ok) {
        if (cached) return res.status(200).json({ ...cached, cached: true });
        return res.status(r.status).json({ error: "Upstream error", status: r.status });
      }

      fresh = await r.json();
      // Store to KV for 5 minutes
      kvSet(KV_KEY, fresh, TTL).catch(() => {});
    } catch (e) {
      if (cached) return res.status(200).json({ ...cached, cached: true });
      return res.status(500).json({ error: "Fetch failed", detail: String(e) });
    }

    return res.status(200).json(fresh);
  } catch (err) {
    return res.status(500).json({ error: "Handler failed", detail: String(err) });
  }
}
