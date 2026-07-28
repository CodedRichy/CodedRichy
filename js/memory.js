/* The site remembers you — a small demonstration of the thesis behind HCR:
   intelligence is persistent state. Visits, viewed projects, and preferences
   persist in localStorage; the hero status line narrates the restored session. */
(function () {
  'use strict';

  var KEY = 'rpk-memory';

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function save(mem) {
    try {
      localStorage.setItem(KEY, JSON.stringify(mem));
    } catch (e) { /* storage unavailable — degrade to goldfish mode */ }
  }

  var mem = load();
  var now = Date.now();
  var isReturn = !!mem.lastVisit;
  var prevLastVisit = mem.lastVisit;
  var prevLastProject = mem.lastProject;

  // --- Record this visit ---
  mem.visits = (mem.visits || 0) + 1;
  mem.lastVisit = now;
  mem.seen = mem.seen || {};

  // On a project page, remember the project
  var pathMatch = location.pathname.match(/projects\/([a-z-]+)\.html/);
  if (pathMatch) {
    var slug = pathMatch[1];
    mem.seen[slug] = now;
    mem.lastProject = slug;
  }
  save(mem);

  var PROJECT_NAMES = {
    'hcr': 'HCR',
    'fixmyprompt': 'FixMyPrompt',
    'veridock': 'Veridock',
    'corvus': 'Corvus',
    'food-chain': 'Food Chain',
    'sentinel': 'Sentinel',
    'tars': 'TARS',
    'roadpack': 'RoadPack',
    'expenso': 'Expenso',
    'gitpulse': 'GitPulse',
    'regulait': 'Regulait'
  };

  function ago(ts) {
    var s = Math.max(1, Math.round((now - ts) / 1000));
    if (s < 60) return 'moments ago';
    var m = Math.round(s / 60);
    if (m < 60) return m + 'm ago';
    var h = Math.round(m / 60);
    if (h < 24) return h + 'h ago';
    var d = Math.round(h / 24);
    return d + 'd ago';
  }

  // --- Hero status line (index only) ---
  var statusEl = document.getElementById('memoryStatus');
  var lineQueue = [];
  var typing = false;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function typeLine(text) {
    if (!statusEl) return;
    lineQueue.push(text);
    if (!typing) drainQueue();
  }

  function drainQueue() {
    var text = lineQueue.shift();
    if (text === undefined) { typing = false; return; }
    typing = true;
    if (reducedMotion) {
      statusEl.textContent = text;
      setTimeout(drainQueue, 400);
      return;
    }
    var i = 0;
    statusEl.textContent = '';
    (function tick() {
      if (i <= text.length) {
        statusEl.textContent = text.slice(0, i);
        i++;
        setTimeout(tick, 24);
      } else {
        setTimeout(drainQueue, 900);
      }
    })();
  }

  // other scripts (freshness.js) may queue their own status lines
  window.rpkStatus = typeLine;

  if (statusEl) {
    if (!isReturn) {
      typeLine('> new session. memory initialized.');
    } else {
      var parts = ['> session restored. visit ' + mem.visits + '.'];
      if (prevLastProject && PROJECT_NAMES[prevLastProject] && prevLastVisit) {
        parts.push('last seen: ' + PROJECT_NAMES[prevLastProject] + ', ' + ago(prevLastVisit) + '.');
      }
      typeLine(parts.join(' '));
    }
    if (mem.visits >= 2 && !mem.termUsed) {
      typeLine('> tip: the >_ up top opens a terminal.');
    }
  }

  // Theme changes narrate too
  var themeBtn = document.getElementById('themeToggle');
  if (themeBtn && statusEl) {
    themeBtn.addEventListener('click', function () {
      typeLine('> preference saved. i will remember.');
    });
  }

  // --- Seen markers on work cards ---
  var cards = document.querySelectorAll('.work-card[href^="projects/"]');
  cards.forEach(function (card) {
    var m = card.getAttribute('href').match(/projects\/([a-z-]+)\.html/);
    if (m && mem.seen[m[1]]) {
      var tab = card.querySelector('.wc-tab-label');
      if (tab && !tab.querySelector('.seen-dot')) {
        var dot = document.createElement('span');
        dot.className = 'seen-dot';
        dot.title = 'You read this ' + ago(mem.seen[m[1]]);
        tab.insertBefore(dot, tab.firstChild);
      }
    }
  });

  // --- Footer: personalized tagline on return + forget-me ---
  var taglineEl = document.getElementById('footerTagline');
  if (taglineEl && isReturn && mem.visits >= 3) {
    taglineEl.textContent = 'Visit ' + mem.visits + '. The footer remembers you, even if you skim it.';
  }

  var credit = document.querySelector('.footer-credit');
  if (credit && !document.getElementById('forgetMe')) {
    var sep = document.createTextNode(' · ');
    var forget = document.createElement('a');
    forget.id = 'forgetMe';
    forget.href = '#';
    forget.textContent = 'forget me';
    forget.setAttribute('aria-label', 'Clear everything this site remembers about you');
    forget.addEventListener('click', function (e) {
      e.preventDefault();
      try {
        localStorage.removeItem(KEY);
        localStorage.removeItem('rpk-theme');
      } catch (err) { /* nothing to forget */ }
      if (statusEl) {
        lineQueue.length = 0;
        typeLine('> memory wiped. we never met.');
      } else {
        forget.textContent = 'forgotten.';
      }
    });
    credit.appendChild(sep);
    credit.appendChild(forget);
  }
})();
