(function () {
  'use strict';

  // --- Theme toggle ---
  var themeToggle = document.getElementById('themeToggle');
  var root = document.documentElement;

  function currentTheme() {
    var explicit = root.getAttribute('data-theme');
    if (explicit) return explicit;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function setTheme(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem('rpk-theme', theme);
  }

  themeToggle.addEventListener('click', function () {
    setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  });

  // --- Nav hide on scroll down, show on scroll up ---
  var header = document.getElementById('siteHeader');
  var lastY = window.scrollY;
  var ticking = false;

  function onScroll() {
    var y = window.scrollY;
    if (y > lastY && y > 120) {
      header.classList.add('header-hidden');
    } else {
      header.classList.remove('header-hidden');
    }
    lastY = y;
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScroll);
    }
  }, { passive: true });

  // --- Mobile menu panel inside the pill ---
  var menuBtn = document.getElementById('menuBtn');
  var navWrap = document.getElementById('navWrap');
  var menuPanel = document.getElementById('navMenuPanel');

  menuBtn.addEventListener('click', function () {
    var open = navWrap.classList.toggle('menu-open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });

  menuPanel.addEventListener('click', function (e) {
    if (e.target.closest('a')) {
      navWrap.classList.remove('menu-open');
      menuBtn.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && navWrap.classList.contains('menu-open')) {
      navWrap.classList.remove('menu-open');
      menuBtn.setAttribute('aria-expanded', 'false');
    }
  });

  // --- Testimonial stack (button-driven deck) ---
  var stack = document.getElementById('tsStack');
  if (stack) {
    var cards = Array.prototype.slice.call(stack.querySelectorAll('.ts-card'));
    var active = 0;

    function layout() {
      cards.forEach(function (card, i) {
        var offset = (i - active + cards.length) % cards.length;
        if (offset === 0) {
          card.style.transform = 'translateY(0) scale(1)';
          card.style.opacity = '1';
          card.style.zIndex = '3';
          card.style.pointerEvents = 'auto';
        } else if (offset === 1) {
          card.style.transform = 'translateY(14px) scale(0.955)';
          card.style.opacity = '0.65';
          card.style.zIndex = '2';
          card.style.pointerEvents = 'none';
        } else if (offset === 2) {
          card.style.transform = 'translateY(28px) scale(0.91)';
          card.style.opacity = '0.3';
          card.style.zIndex = '1';
          card.style.pointerEvents = 'none';
        } else {
          card.style.transform = 'translateY(40px) scale(0.88)';
          card.style.opacity = '0';
          card.style.zIndex = '0';
          card.style.pointerEvents = 'none';
        }
      });
    }

    function next() { active = (active + 1) % cards.length; layout(); }
    function prev() { active = (active - 1 + cards.length) % cards.length; layout(); }

    document.getElementById('tsNext').addEventListener('click', next);
    document.getElementById('tsPrev').addEventListener('click', prev);
    cards.forEach(function (card) { card.addEventListener('click', next); });
    layout();
  }

  // --- Footer tagline ---
  var TAGLINES = [
    'If you got here, the hero worked.',
    'Built with Claude Code and approximately 47 open tabs.',
    'Shipped at 3am. Debugged at 7am.',
    'If it doesn\'t run, it doesn\'t count.',
    'My agents remember this footer so I don\'t have to.',
    '40 MCP tools and still couldn\'t center this div.',
    'Footer real estate: criminally underrated.',
    'Did you read this? We should be friends.'
  ];
  var taglineEl = document.getElementById('footerTagline');
  if (taglineEl) {
    taglineEl.textContent = TAGLINES[Math.floor(Math.random() * TAGLINES.length)];
  }
})();
