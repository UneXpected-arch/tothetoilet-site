export default async function handler(req, res) {
  try {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;

    if (!bearerToken) {
      return res.status(500).json({ error: "Missing Twitter API bearer token" });
    }

    const username = "WIPE_it_UP"; // Your Twitter username
    const userUrl = `https://api.twitter.com/2/users/by/username/${username}`;
    const userRes = await fetch(userUrl, {
      headers: { Authorization: `Bearer ${bearerToken}` }
    });
    const userData = await userRes.json();
    if (!userData.data?.id) {
      return res.status(404).json({ error: "User not found" });
    }

    const tweetsUrl = `https://api.twitter.com/2/users/${userData.data.id}/tweets?max_results=5&tweet.fields=created_at,text&expansions=attachments.media_keys&media.fields=url,preview_image_url`;
    const tweetsRes = await fetch(tweetsUrl, {
      headers: { Authorization: `Bearer ${bearerToken}` }
    });
    const tweetsData = await tweetsRes.json();

    res.setHeader("Content-Type", "application/json");
    res.status(200).json(tweetsData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch tweets" });
  }
}
