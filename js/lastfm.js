/* Music card — what Rishi is listening to, in a band between the testimonials
 * and the footer.
 *
 * Talks to the lastfm-proxy worker, never to Last.fm directly: the API key
 * stays server-side. See worker/README.md.
 *
 * Three rules it is built around:
 *
 * 1. Never touch the hero status line. That line is single-slot (memory.js
 *    typeLine replaces rather than appends) and a network fetch always resolves
 *    after freshness.js, so writing there buries "> github: last push ...".
 *
 * 2. Survive silence. He isn't playing music most of the time. Now-playing is
 *    the only part that can be empty, so everything else — top artists, the
 *    week, lifetime counts — carries the card when nothing is on.
 *
 * 3. Degrade in pieces. Any row whose data is missing is dropped, not faked.
 *    If the worker is unreachable the card never mounts at all.
 *
 * Two endpoints, two clocks: /now is polled every 60s, /music is fetched once.
 */
(function () {
  'use strict';

  var ENDPOINT = 'https://lastfm-proxy.rishipraseeth.workers.dev';
  var POLL_MS = 60 * 1000;

  var card = null, timer = null, sig = null;
  var DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  function ago(uts) {
    var s = Date.now() / 1000 - uts;
    if (s < 90) return 'just now';
    var m = Math.round(s / 60);
    if (m < 60) return m + 'm ago';
    var h = Math.round(m / 60);
    if (h < 24) return h + 'h ago';
    return Math.round(h / 24) + 'd ago';
  }

  function commas(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;   // always text, never innerHTML —
    return n;                                 // track titles are third-party data
  }

  /* ---- mount ---- */

  /* The card lives INSIDE the footer, not above it. Sitting between the two
     sections left it stranded in dead space: the footer is 40vh of particle
     field, so any padding that centred the card against the footer's box top
     still read as "too high" against the nav pill you actually see — and the
     40vh half moves with the window, so no fixed padding could hold it.
     Inside, the canvas spans the card and the particles drift past behind it. */
  function mount() {
    if (card) return card;
    var footer = document.getElementById('footer') || document.querySelector('footer');
    if (!footer) return null;

    var band = el('section', 'lfm-band');
    band.setAttribute('aria-label', 'Listening');
    card = el('div', 'lfm');
    band.appendChild(card);

    // after the canvas so it paints above it; the canvas is absolute inset:0
    var canvas = footer.querySelector('canvas');
    footer.insertBefore(band, canvas ? canvas.nextSibling : footer.firstChild);

    // opts the footer into card-sized padding without touching other pages
    footer.classList.add('has-lfm');
    // footer-particles.js picks the new height up via its ResizeObserver
    return card;
  }

  /* ---- rows ---- */

  function nowRow(d) {
    var row = el('a', 'lfm-now' + (d.playing ? ' is-live' : ''));
    row.href = d.url || '#';
    row.target = '_blank';
    row.rel = 'noopener noreferrer';

    /* The record needs reserved width of its own — as a pseudo-element on the
       row it slid over the track title. */
    var sleeve = el('div', 'lfm-sleeve');
    sleeve.appendChild(el('span', 'lfm-disc'));
    if (d.art) {
      var img = el('img', 'lfm-art');
      img.src = d.art; img.alt = ''; img.loading = 'lazy';
      sleeve.appendChild(img);
    } else {
      sleeve.appendChild(el('span', 'lfm-art lfm-art-empty'));
    }
    row.appendChild(sleeve);

    var meta = el('div', 'lfm-now-meta');
    var label = el('div', 'lfm-label');
    if (d.playing) {
      var eq = el('span', 'lfm-eq');
      eq.appendChild(el('i')); eq.appendChild(el('i')); eq.appendChild(el('i'));
      label.appendChild(eq);
      label.appendChild(el('span', null, 'now playing'));
    } else {
      label.appendChild(el('span', null, d.playedAt ? 'last played · ' + ago(d.playedAt) : 'last played'));
    }
    meta.appendChild(label);
    meta.appendChild(el('div', 'lfm-track', d.track || ''));
    meta.appendChild(el('div', 'lfm-artist',
      [d.artist, d.album].filter(Boolean).join(' · ')));
    row.appendChild(meta);
    return row;
  }

  /* Seven bars, scaled to the week's own peak. Deliberately unlabelled: the
     counts are capped at 200 scrobbles a week by the API, so the shape is
     honest but the numbers wouldn't be. */
  function weekRow(week) {
    var peak = Math.max.apply(null, week) || 1;
    var wrap = el('div', 'lfm-week');
    var today = new Date().getDay();
    week.forEach(function (n, i) {
      var col = el('div', 'lfm-week-col');
      var track = el('div', 'lfm-week-track');
      var bar = el('i');
      bar.style.height = Math.max(6, Math.round(n / peak * 100)) + '%';
      if (n === 0) bar.classList.add('is-zero');
      track.appendChild(bar);
      col.appendChild(track);
      // week[6] is today; walk backwards for the letters
      col.appendChild(el('span', null, DAYS[(today - (6 - i) + 7) % 7]));
      col.title = n + ' scrobbles';
      wrap.appendChild(col);
    });
    return wrap;
  }

  /* Artists render as type, not avatars: Last.fm deprecated artist images and
     returns the same placeholder star for every one of them. */
  function artistRows(artists) {
    var peak = artists[0] && artists[0].plays || 1;
    var list = el('ol', 'lfm-artists');
    artists.forEach(function (a) {
      var li = el('li');
      var link = el('a', 'lfm-artist-row');
      link.href = a.url || '#';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.appendChild(el('span', 'lfm-artist-name', a.name));
      var track = el('span', 'lfm-bar');
      var fill = el('i');
      fill.style.width = Math.round(a.plays / peak * 100) + '%';
      track.appendChild(fill);
      link.appendChild(track);
      link.appendChild(el('span', 'lfm-plays', String(a.plays)));
      li.appendChild(link);
      list.appendChild(li);
    });
    return list;
  }

  function albumRow(albums) {
    var wrap = el('div', 'lfm-albums');
    albums.forEach(function (a) {
      var link = el('a', 'lfm-album');
      link.href = a.url || '#';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.title = a.name + ' — ' + a.artist + ' · ' + a.plays + ' plays';
      if (a.art) {
        var img = el('img');
        img.src = a.art; img.alt = a.name; img.loading = 'lazy';
        link.appendChild(img);
      } else {
        /* No art — either Last.fm has none, or the worker withheld it. Either
           way the album keeps its rank and renders as type, so the grid never
           shows a hole. The client is not told which case it is. */
        link.appendChild(el('span', 'lfm-art-empty', a.name));
      }
      wrap.appendChild(link);
    });
    return wrap;
  }

  /* Built as nodes rather than innerHTML to match the rest of the file. Static
     markup, but one exception invites another. */
  function arrowIcon() {
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'arrow-icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    var path = document.createElementNS(NS, 'path');
    path.setAttribute('d', 'M7 7h10v10M7 17 17 7');
    svg.appendChild(path);
    return svg;
  }

  /* Last.fm has no follow-intent URL — following happens on the profile page
     once you're signed in, so the button just goes there. */
  function footRow(stats) {
    var row = el('div', 'lfm-foot');
    var year = stats.since ? new Date(stats.since * 1000).getFullYear() : null;
    row.appendChild(el('span', 'lfm-since',
      year ? 'scrobbling since ' + year : 'last.fm'));

    var btn = el('a', 'lfm-follow');
    btn.href = stats.url;
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.appendChild(el('span', null, 'Follow on Last.fm'));
    btn.appendChild(arrowIcon());
    row.appendChild(btn);
    return row;
  }

  function section(title, node, aside) {
    var s = el('div', 'lfm-sec');
    var head = el('div', 'lfm-sec-head');
    head.appendChild(el('span', 'lfm-label', title));
    if (aside) head.appendChild(el('span', 'lfm-aside', aside));
    s.appendChild(head);
    s.appendChild(node);
    return s;
  }

  /* ---- render ---- */

  var state = { now: null, music: null };

  function paint() {
    if (!state.now || !mount()) return;
    var d = state.now, m = state.music || {};

    var next = JSON.stringify([d.playing, d.track, d.artist, m.stats && m.stats.scrobbles]);
    if (next === sig) return;      // nothing moved, don't repaint
    sig = next;

    card.textContent = '';
    card.appendChild(nowRow(d));

    if (m.week) {
      card.appendChild(section('this week', weekRow(m.week),
        m.stats && m.stats.scrobbles ? commas(m.stats.scrobbles) + ' scrobbles' : null));
    }
    if (m.artists && m.artists.length) {
      card.appendChild(section('top artists · 7 days', artistRows(m.artists),
        m.stats && m.stats.artists ? commas(m.stats.artists) + ' all time' : null));
    }
    if (m.albums && m.albums.length) {
      card.appendChild(section('on repeat · 30 days', albumRow(m.albums), null));
    }
    if (m.stats && m.stats.url) card.appendChild(footRow(m.stats));
    card.classList.add('is-in');
  }

  /* ---- fetch ---- */

  function grab(path) {
    return fetch(ENDPOINT + path, { mode: 'cors' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); });
  }

  function pollNow() {
    grab('/now')
      .then(function (d) { if (d && d.track) { state.now = d; paint(); } })
      .catch(function () { /* worker down — leave whatever is on screen */ });
  }

  /* Polling a hidden tab spends the worker's quota to render nothing. */
  function start() {
    if (timer) return;
    if (!state.music) {
      grab('/music')
        .then(function (m) { state.music = m; paint(); })
        .catch(function () { /* card just runs without the stats rows */ });
    }
    pollNow();
    timer = setInterval(pollNow, POLL_MS);
  }
  function stop() { clearInterval(timer); timer = null; }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
