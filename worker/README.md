# lastfm-proxy

Holds the Last.fm API key so the browser never sees it.

`now playing` is only true for a few minutes, so it can't be baked into the
nightly `data/activity.json` build the way GitHub freshness is — it has to be
fetched live. A live fetch from the page would expose the key in devtools.
This worker is the smallest thing that removes that trade-off.

## Deploy

```bash
npm install -g wrangler     # once
wrangler login              # once

cd worker
wrangler secret put LASTFM_API_KEY   # paste the key when prompted
wrangler secret put LASTFM_USER      # your last.fm username
wrangler deploy
```

Wrangler prints the URL, e.g. `https://lastfm-proxy.<subdomain>.workers.dev`.
Put that in `js/lastfm.js` as `ENDPOINT`.

## Local

```bash
cp .dev.vars.example .dev.vars   # fill both values
wrangler dev
curl http://127.0.0.1:8787/now
```

## Response

```json
{
  "playing": true,
  "track": "Neon Rust",
  "artist": "Kavya Iyer",
  "album": "Hex Cassette",
  "art": "https://lastfm.freetls.fastly.net/i/u/300x300/....png",
  "url": "https://www.last.fm/music/...",
  "playedAt": null
}
```

`playing: false` with a `playedAt` timestamp means nothing is on right now and
this is the last track played — that's the widget's empty state, not a failure.

## Notes

- Responses are edge-cached 30s, so upstream calls don't scale with visitors.
  Last.fm suspends clients making "several calls per second".
- `ALLOWED_ORIGINS` in `wrangler.toml` protects the rate limit, not the data —
  everything returned is already public.
- Failures return 502 with `playing: false` so the widget can hide itself
  instead of rendering a broken state.
