// api/twitter-media.js
export default async function handler(req, res) {
  const token = process.env.TWITTER_BEARER_TOKEN;
  const userId = process.env.TWITTER_USER_ID;

  if (!token || !userId) {
    return res.status(500).json({ error: "Missing TWITTER_BEARER_TOKEN or TWITTER_USER_ID" });
  }

  try {
    const url = new URL(`https://api.twitter.com/2/users/${userId}/tweets`);
    url.search = new URLSearchParams({
      "tweet.fields": "created_at,public_metrics,entities,attachments",
      expansions: "attachments.media_keys,author_id",
      "user.fields": "name,username,profile_image_url",
      "media.fields": "url,preview_image_url,alt_text"
    });

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!resp.ok) {
      const detail = await resp.text();
      return res.status(resp.status).json({ error: "Tweets fetch failed", detail });
    }

    const data = await resp.json();
    return res.status(200).json(data);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error", detail: err.message });
  }
}
