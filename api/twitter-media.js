// /api/twitter-media.js
export default async function handler(req, res) {
  const bearer = process.env.TWITTER_BEARER_TOKEN;
  if (!bearer) {
    return res.status(500).json({ error: 'Missing TWITTER_BEARER_TOKEN' });
  }

  // Allow override via ?user=handle; fallback to env or WIPE_it_UP
  const username =
    (req.query.user || process.env.TWITTER_USERNAME || 'WIPE_it_UP')
      .replace(/[^A-Za-z0-9_]/g, '');

  try {
    // 1) Resolve user id
    const userRes = await fetch(
      `https://api.twitter.com/2/users/by/username/${username}?user.fields=name,username,profile_image_url`,
      { headers: { Authorization: `Bearer ${bearer}` } }
    );

    const userJson = await userRes.json();

    // If API returned an errors array (common for not found), surface it clearly
    if (userJson?.errors?.length) {
      const detail = userJson.errors[0]?.detail || 'User lookup failed';
      return res.status(404).json({ error: detail, username });
    }

    const uid = userJson?.data?.id;
    if (!uid) {
      return res.status(404).json({ error: 'User not found (no id in response)', username, raw: userJson });
    }

    // 2) Fetch recent tweets with media expansion
    const params = new URLSearchParams({
      max_results: '5',
      'tweet.fields': 'created_at,public_metrics,entities,attachments,source',
      expansions: 'attachments.media_keys,author_id',
      'media.fields': 'url,preview_image_url,alt_text'
    });

    const tweetsRes = await fetch(
      `https://api.twitter.com/2/users/${uid}/tweets?${params.toString()}`,
      { headers: { Authorization: `Bearer ${bearer}` } }
    );

    if (!tweetsRes.ok) {
      const txt = await tweetsRes.text().catch(() => '');
      return res.status(tweetsRes.status).json({ error: `Tweets fetch failed`, detail: txt });
    }

    const tweetsJson = await tweetsRes.json();

    // Basic shape back to the client (front-end formats it)
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.status(200).json({
      user: {
        id: uid,
        name: userJson.data.name,
        username: userJson.data.username,
        profile_image_url: userJson.data.profile_image_url,
      },
      ...tweetsJson
    });
  } catch (e) {
    return res.status(500).json({ error: 'Unhandled server error', detail: String(e) });
  }
}
