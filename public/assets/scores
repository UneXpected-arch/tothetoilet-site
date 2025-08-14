// api/scores.js
export const config = { runtime: "edge" };

const URL  = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
// Key names
const ZKEY = "wipe:scores";       // zset for scores
const UKEY = "wipe:user:";        // user hash prefix for metadata

function json(body, status=200, headers={}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

async function redis(cmd) {
  // REST payload: { "command": ["ZADD","key","NX",score,member] } etc
  const r = await fetch(`${URL}/pipeline`, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(cmd),
    // tiny cache for GETs is fine (Vercel edge has CDN), we’ll control max-age client-side
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export default async (req) => {
  const { method } = req;
  const { searchParams } = new URL(req.url);

  try {
    if (method === "GET") {
      // /api/scores?limit=10
      const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);
      // ZREVRANGE withscores
      const data = await redis([
        { command: ["ZREVRANGE", ZKEY, "0", String(limit-1), "WITHSCORES"] }
      ]);

      const [arr] = data;
      const flat = arr?.result || [];
      const rows = [];
      for (let i = 0; i < flat.length; i += 2) {
        const member = flat[i];          // member is userId
        const score  = Number(flat[i+1]);
        rows.push({ userId: member, score });
      }

      // Resolve usernames in a single pipeline
      if (rows.length) {
        const pipe = rows.map(r => ({ command: ["HGET", UKEY + r.userId, "name"] }));
        const names = await redis(pipe);
        rows.forEach((r, idx) => { r.name = names[idx]?.result || `Degen #${r.userId.slice(-4)}`; });
      }
      return json({ rows });
    }

    if (method === "POST") {
      const body = await req.json().catch(() => ({}));
      let { userId, name, score } = body;
      if (!userId || typeof userId !== "string" || userId.length > 64) return json({ error: "Bad userId" }, 400);
      score = Number(score);
      if (!Number.isFinite(score)) return json({ error: "Bad score" }, 400);
      name = (name || "").toString().slice(0, 24);

      // Store: username (HSET), and best score (ZADD GT to keep max)
      const res = await redis([
        { command: ["HSET", UKEY + userId, "name", name] },
        { command: ["ZADD", ZKEY, "GT", String(score), userId] },
      ]);

      return json({ ok: true, updated: res?.[1]?.result === 1 });
    }

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { "access-control-allow-methods": "GET,POST,OPTIONS" } });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (e) {
    return json({ error: "server_error", detail: String(e.message || e) }, 500);
  }
};
