/* GitHub freshness — proof the projects are alive.

   Reads data/activity.json, written nightly by the update-profile Action. The
   browser can't do this itself: seeing private repos needs a token, and a token
   in this file is public. So the build resolves it and ships a static answer.

   The hero line counts private pushes without naming them, which is the whole
   point — every project started since Aug 2026 is private, and the old
   public-API version reported "last push 9d ago" through a month of daily work.

   Falls back to the public API so the page still works from a bare checkout. */
(function () {
  'use strict';

  var CACHE_KEY = 'rpk-gh3'; // bumped: v2 cached public-only data
  var TTL = 60 * 60 * 1000;
  var BASE = /\/(projects|writing)\//.test(location.pathname) ? '../' : '';
  var FEED = BASE + 'data/activity.json';
  var API = 'https://api.github.com/users/CodedRichy/repos?sort=pushed&per_page=100';

  // portfolio slug -> repo name (only repos that are actually public)
  var REPO_MAP = {
    'gitpulse': 'GitPulse',
    'regulait': 'Regulait',
    'food-chain': 'food-chain-ideation',
    'litecpu16': 'LiteCPU16'
  };

  function ago(iso) {
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 3600) return 'just now';
    var h = Math.round(s / 3600);
    if (h < 24) return h + 'h ago';
    var d = Math.round(h / 24);
    if (d < 45) return d + 'd ago';
    return Math.round(d / 30) + 'mo ago';
  }

  /* newest may outrun anything in `repos` — that gap is the private work */
  function apply(repos, newestOverride) {
    // per-row chips on Also built
    document.querySelectorAll('.more-row[href^="projects/"]').forEach(function (row) {
      var m = row.getAttribute('href').match(/projects\/([a-z-]+)\.html/);
      var repo = m && REPO_MAP[m[1]];
      if (!repo || !repos[repo] || row.querySelector('.gh-fresh')) return;
      var chip = document.createElement('span');
      chip.className = 'gh-fresh';
      chip.textContent = 'pushed ' + ago(repos[repo]);
      var arrow = row.querySelector('.arrow-icon');
      row.insertBefore(chip, arrow);
    });

    // hero status line: newest push across the account, private repos included
    var newest = newestOverride || null;
    for (var name in repos) {
      if (!newest || repos[name] > newest) newest = repos[name];
    }
    if (newest && window.rpkStatus && document.getElementById('memoryStatus')) {
      window.rpkStatus('> github: last push ' + ago(newest) + '.');
    }
  }

  function fromCache() {
    try {
      var c = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (c && c.ts && Date.now() - c.ts < TTL) return c;
    } catch (e) { /* refetch */ }
    return null;
  }

  function save(repos, newest) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), repos: repos, newest: newest }));
    } catch (e) { /* fine */ }
  }

  var cached = fromCache();
  if (cached) { apply(cached.repos, cached.newest); return; }

  fetch(FEED, { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function (feed) {
      save(feed.public || {}, feed.newest_push);
      apply(feed.public || {}, feed.newest_push);
    })
    .catch(function () {
      // no feed yet (bare checkout, or the Action hasn't run) — public API only
      return fetch(API)
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function (list) {
          // archived repos are frozen by definition — a "pushed 4mo ago" chip on one
          // advertises a project that has been formally retired
          var repos = {};
          list.forEach(function (r) { if (!r.archived) repos[r.name] = r.pushed_at; });
          save(repos, null);
          apply(repos, null);
        });
    })
    .catch(function () { /* offline or rate-limited — the site just stays quiet */ });
})();
