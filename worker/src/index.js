/* Last.fm proxy — the API key lives here, never in the browser.
 *
 * The site can't call Last.fm directly: "now playing" is only true for a few
 * minutes, so it must be fetched live, and a live fetch from the page would put
 * the key in devtools. This worker holds the key and returns only the answer.
 *
 * Two endpoints because the data has two different clocks:
 *
 *   GET /now     nowplaying + last track.  30s cache, polled every 60s.
 *   GET /music   top artists, top albums, 7-day shape, lifetime counts.
 *                10min cache, fetched once per page load.
 *
 * Splitting them means the expensive call (4 subrequests) runs six times an
 * hour instead of 120, while the cheap one stays fresh enough to feel live.
 *
 * Everything returned is already public. The origin check and the caches
 * aren't protecting the data — they're protecting the rate limit, since
 * Last.fm suspends clients making "several calls per second".
 */

const NOW_TTL = 30;
const MUSIC_TTL = 600;
const TIMEOUT_MS = 6000;
const UA = 'rishipraseeth.in-nowplaying/1.0 (+https://rishipraseeth.in)';

// Last.fm returns this placeholder for anything without real artwork
const PLACEHOLDER = '2a96cbd8b46e442fc41c2b86b821562f';

/* ---------- http helpers ---------- */

function cors(origin, allowed, ttl) {
  const allow = !allowed.length ? '*' : allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Vary': 'Origin',
    'Cache-Control': `public, max-age=${ttl}`,
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

function api(env, method, params) {
  const url = new URL('https://ws.audioscrobbler.com/2.0/');
  url.searchParams.set('method', method);
  url.searchParams.set('user', env.LASTFM_USER);
  url.searchParams.set('api_key', env.LASTFM_API_KEY);
  url.searchParams.set('format', 'json');
  for (const k in params) url.searchParams.set(k, params[k]);
  return url;
}

/* AbortController rather than AbortSignal.timeout(): the latter isn't in the
   Workers runtime docs, and a deploy-time ReferenceError is a bad way to find
   that out. */
async function get(env, method, params) {
  const ctrl = new AbortController();
  const kill = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(api(env, method, params), {
      headers: { 'User-Agent': UA },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`${method} http ${res.status}`);
    const data = await res.json();
    // Last.fm answers errors with HTTP 200 and an `error` code in the body
    if (data.error) throw new Error(`${method} error ${data.error}: ${data.message}`);
    return data;
  } finally {
    clearTimeout(kill);
  }
}

/* ---------- artwork safety ---------- */

/* Some covers in the library are not things a recruiter should meet without
 * warning. This is a denylist rather than a classifier on purpose: a vision
 * model's false negatives are the entire risk, and a 95%-accurate one still
 * ships the bad frame one visit in twenty, at a moment nobody controls. A list
 * is exact and free. Its weakness is the opposite — it only knows what it's
 * been told — so BLOCKED_ART exists to add entries without a code deploy:
 *
 *   wrangler secret put ... no: it's not secret. Edit [vars] in wrangler.toml,
 *   or: wrangler deploy --var BLOCKED_ART:"Artist - Album,Other Artist - *"
 *
 * Entries are "artist - album", or "artist - *" to block an artist outright.
 * Matching ignores case, punctuation and spacing, so "PARTYNEXTDOOR 4 (P4)"
 * and "partynextdoor 4 p4" are the same key.
 *
 * Blocking strips the URL server-side, so it never reaches devtools either.
 */
/* Reviewed against the top 200 albums of all time on 2026-08-15. Nudity and
 * overtly sexual framing only — shirtless is not on this list (Travis Scott's
 * UTOPIA, Frank Ocean's Blond and Tems all stay).
 *
 * Titles are listed with their variants because matching is exact on the album
 * string: "Teenage Dream" and "Teenage Dream: The Complete Confection" are two
 * different keys, and Last.fm will hand back whichever the scrobble used.
 */
const BLOCKED_ART = [
  'PARTYNEXTDOOR - PARTYNEXTDOOR 4 (P4)',
  'Katy Perry - Teenage Dream',
  'Katy Perry - Teenage Dream: The Complete Confection',
  'Maroon 5 - Hands All Over',
  'Maroon 5 - Hands All Over (Revised International Standard version)',
  'Sean Paul - Mad Love The Prequel',
  'Lex Amarni - the kill 2',
  'Playboi Carti - Playboi Carti',
  'The Kid LAROI - THE FIRST TIME',
  'Frank Ocean - Novacane',
];

const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function blocklist(env) {
  const extra = (env.BLOCKED_ART || '').split(',');
  const set = new Set();
  for (const line of BLOCKED_ART.concat(extra)) {
    // split on the FIRST " - ": artists rarely contain it, album titles do
    // ("Live - Deluxe"), so first-match keeps the artist half intact
    const i = String(line).indexOf(' - ');
    if (i < 0) continue;
    const artist = norm(line.slice(0, i));
    if (!artist) continue;      // a malformed entry must not become a catch-all
    set.add(artist + '|' + norm(line.slice(i + 3)));
  }
  return set;
}

/* Blocks the exact album, or the artist wholesale via an "artist - *" entry. */
function artBlocked(set, artist, album) {
  const a = norm(artist);
  if (!a) return false;       // unknown artist can't match an "artist - *" rule
  return set.has(a + '|' + norm(album)) || set.has(a + '|');
}

/* Image array runs small -> extralarge; take the largest real one. */
function pickArt(images) {
  if (!Array.isArray(images)) return null;
  for (let i = images.length - 1; i >= 0; i--) {
    const url = images[i]['#text'];
    if (url && !url.includes(PLACEHOLDER)) return url;
  }
  return null;
}

const arr = x => (Array.isArray(x) ? x : x ? [x] : []);
const num = x => { const n = Number(x); return Number.isFinite(n) ? n : null; };

/* ---------- /now ---------- */

function shapeTrack(t, blocked) {
  if (!t) return { playing: false };
  const np = t['@attr'] && t['@attr'].nowplaying === 'true';
  const artist = (t.artist && (t.artist['#text'] || t.artist.name)) || null;
  const album = (t.album && t.album['#text']) || null;
  // the now-playing sleeve is the same cover at a larger size — filter it too
  const hide = artBlocked(blocked, artist, album);
  return {
    playing: Boolean(np),
    track: t.name || null,
    artist,
    album,
    art: hide ? null : pickArt(t.image),
    url: t.url || null,
    // absent while a track is actually playing — that's the tell, not an error
    playedAt: t.date && t.date.uts ? Number(t.date.uts) : null,
  };
}

async function buildNow(env) {
  const data = await get(env, 'user.getrecenttracks', { limit: 1 });
  const list = data.recenttracks && data.recenttracks.track;
  return shapeTrack(arr(list)[0], blocklist(env));
}

/* ---------- /music ---------- */

/* Seven daily counts, oldest first. Last.fm has no per-day endpoint, so this
   buckets raw scrobbles by day. Capped at 200 (one page): beyond that the
   oldest days undercount, which is why the client draws these as a shape and
   never prints them as numbers. */
async function weekShape(env) {
  const DAY = 86400;
  const now = Math.floor(Date.now() / 1000);
  const from = now - 7 * DAY;
  const data = await get(env, 'user.getrecenttracks', { limit: 200, from, to: now });
  const days = [0, 0, 0, 0, 0, 0, 0];
  for (const t of arr(data.recenttracks && data.recenttracks.track)) {
    if (!t.date || !t.date.uts) continue;           // nowplaying has no date
    const i = Math.floor((Number(t.date.uts) - from) / DAY);
    if (i >= 0 && i < 7) days[i]++;
  }
  return days;
}

async function topArtists(env, period, limit) {
  const data = await get(env, 'user.gettopartists', { period, limit });
  return arr(data.topartists && data.topartists.artist).map(a => ({
    name: a.name,
    plays: num(a.playcount) || 0,
    url: a.url,
    // artist images are deprecated in the API — every one returns the
    // placeholder star, so the client renders artists as type, not avatars
  }));
}

async function topAlbums(env, period, limit) {
  const data = await get(env, 'user.gettopalbums', { period, limit });
  const blocked = blocklist(env);
  return arr(data.topalbums && data.topalbums.album).map(a => {
    const artist = a.artist && a.artist.name;
    const hide = artBlocked(blocked, artist, a.name);
    return {
      name: a.name,
      artist,
      plays: num(a.playcount) || 0,
      // the album keeps its place in the ranking — only the picture goes
      art: hide ? null : pickArt(a.image),
      url: a.url,
    };
  });
}

async function profile(env) {
  const data = await get(env, 'user.getinfo', {});
  const u = data.user || {};
  return {
    scrobbles: num(u.playcount),
    artists: num(u.artist_count),
    tracks: num(u.track_count),
    albums: num(u.album_count),
    since: u.registered ? num(u.registered.unixtime || u.registered['#text']) : null,
    url: u.url || null,
  };
}

async function buildMusic(env) {
  // any one of these may fail without taking the panel down — the client
  // drops whichever row is missing
  const [week, artists, albums, stats] = await Promise.all([
    weekShape(env).catch(() => null),
    topArtists(env, '7day', 5).catch(() => null),
    topAlbums(env, '1month', 4).catch(() => null),
    profile(env).catch(() => null),
  ]);
  return { week, artists, albums, stats };
}

/* ---------- entry ---------- */

const ROUTES = {
  '/now': { ttl: NOW_TTL, build: buildNow },
  '/music': { ttl: MUSIC_TTL, build: buildMusic },
};

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const { pathname } = new URL(request.url);
    const route = ROUTES[pathname === '/' ? '/now' : pathname];
    const headers = cors(origin, allowed, route ? route.ttl : 60);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: { ...headers, 'Access-Control-Allow-Methods': 'GET, OPTIONS' },
      });
    }
    if (request.method !== 'GET') return json({ error: 'method not allowed' }, 405, headers);
    if (!route) return json({ error: 'not found' }, 404, headers);
    if (!env.LASTFM_API_KEY || !env.LASTFM_USER) {
      return json({ error: 'worker not configured' }, 500, headers);
    }

    // Cache key is path + deployed version — the payload is identical for every
    // visitor, so one upstream round serves everyone inside the TTL, but a new
    // deploy starts a fresh key so blocklist edits take effect immediately.
    const cache = caches.default;
    const ver = (env.CF_VERSION && env.CF_VERSION.id) || 'dev';
    const keyUrl = new URL(pathname, request.url);
    keyUrl.searchParams.set('v', ver);
    const key = new Request(keyUrl.toString(), { method: 'GET' });
    const hit = await cache.match(key);
    if (hit) return json(await hit.json(), 200, { ...headers, 'X-Cache': 'HIT' });

    try {
      const payload = await route.build(env);
      const store = json(payload, 200, { 'Cache-Control': `public, max-age=${route.ttl}` });
      ctx.waitUntil(cache.put(key, store.clone()));
      return json(payload, 200, { ...headers, 'X-Cache': 'MISS' });
    } catch (err) {
      // Fail quiet: the widget hides itself rather than showing a broken state.
      return json({ error: String(err.message || err) }, 502, headers);
    }
  },
};
