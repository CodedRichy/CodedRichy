/* GitHub freshness — proof the projects are alive. One unauthenticated API
   call, cached an hour in localStorage to stay far under the rate limit. */
(function () {
  'use strict';

  var CACHE_KEY = 'rpk-gh';
  var TTL = 60 * 60 * 1000;
  var API = 'https://api.github.com/users/CodedRichy/repos?sort=pushed&per_page=100';

  // portfolio slug -> repo name (only repos that are actually public)
  var REPO_MAP = {
    'tars': 'TARS',
    'roadpack': 'RoadPack',
    'expenso': 'Expenso',
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

  function apply(repos) {
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

    // hero status line: newest push across the account
    var newest = null;
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
      if (c && c.ts && Date.now() - c.ts < TTL) return c.repos;
    } catch (e) { /* refetch */ }
    return null;
  }

  var cached = fromCache();
  if (cached) { apply(cached); return; }

  fetch(API)
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function (list) {
      var repos = {};
      list.forEach(function (r) { repos[r.name] = r.pushed_at; });
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), repos: repos })); } catch (e) { /* fine */ }
      apply(repos);
    })
    .catch(function () { /* offline or rate-limited — the site just stays quiet */ });
})();
