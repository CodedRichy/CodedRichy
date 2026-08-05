/* Audio player — one track, one Audio element, owned here.
   terminal.js delegates to window.rpkPlayer so nothing ever double-plays.
   Docks as a pill directly under the nav, inheriting the header's hide-on-scroll.

   Autoplay: browsers block sound until the visitor has interacted with the page,
   so we try, and on rejection arm the first real gesture instead. If the visitor
   ever stops or closes the player, we remember that and stop autostarting. */
(function () {
  'use strict';

  var BASE = /\/(projects|writing)\//.test(location.pathname) ? '../' : '';
  var SRC = BASE + 'assets/audio/oh-que-sera.mp3';
  var TITLE = '₹₹₹';
  var DEFAULT_VOL = 0.2;

  var audio = null, ui = null, els = {}, scrubbing = false, armed = false;
  var GESTURES = ['pointerdown', 'keydown', 'touchstart', 'scroll'];

  /* ---- volume + opt-out ride in the same memory layer as theme and visits ---- */

  function mem() {
    try { return JSON.parse(localStorage.getItem('rpk-memory')) || {}; }
    catch (e) { return {}; }
  }

  function write(patch) {
    try {
      var m = mem();
      for (var k in patch) m[k] = patch[k];
      localStorage.setItem('rpk-memory', JSON.stringify(m));
    } catch (e) { /* fine */ }
  }

  function readVol() {
    var v = parseFloat(mem().vol);
    return (isFinite(v) && v >= 0 && v <= 1) ? v : DEFAULT_VOL;
  }

  function optedOut() { return mem().audioOff === true; }

  /* Each page is a new document, so the Audio element dies on navigation.
     Park the playhead in memory and pick it up on the next page — a short
     gap while the file loads, but no restart from zero. */
  function readAt() {
    var t = parseFloat(mem().audioAt);
    return (isFinite(t) && t > 0) ? t : 0;
  }

  var lastSaved = -1;
  function saveAt(force) {
    if (!audio) return;
    var t = audio.currentTime;
    if (!force && Math.abs(t - lastSaved) < 1) return; // ~1s granularity, not 4x/sec
    lastSaved = t;
    write({ audioAt: t });
  }

  /* ---- audio ---- */

  function ensureAudio() {
    if (audio) return audio;
    audio = new Audio();
    audio.preload = 'auto';
    audio.volume = readVol();
    audio.src = SRC;
    audio.addEventListener('loadedmetadata', function () {
      // resume where the last page left off, unless we were near the end
      var t = readAt();
      if (t > 0 && isFinite(audio.duration) && t < audio.duration - 1) audio.currentTime = t;
      paint();
    });
    audio.addEventListener('timeupdate', function () { saveAt(); paint(); });
    audio.addEventListener('play', paint);
    audio.addEventListener('pause', function () { saveAt(true); paint(); });
    audio.addEventListener('ended', function () {
      audio.currentTime = 0;
      write({ audioAt: 0 });
      paint();
    });
    audio.addEventListener('error', function () {
      if (els.time) els.time.textContent = 'unavailable';
    });
    return audio;
  }

  function fmt(s) {
    if (!isFinite(s) || s < 0) s = 0;
    var m = Math.floor(s / 60);
    var r = Math.floor(s % 60);
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  /* ---- ui ---- */

  function build() {
    if (ui) return;
    ui = document.createElement('div');
    ui.className = 'rplay';
    ui.setAttribute('role', 'region');
    ui.setAttribute('aria-label', 'Audio player');
    ui.innerHTML =
      '<button class="rplay-toggle" aria-label="Play"><span class="rplay-glyph"></span></button>' +
      '<span class="rplay-title">' + TITLE + '</span>' +
      '<input class="rplay-seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Seek">' +
      '<span class="rplay-time">0:00</span>' +
      '<button class="rplay-mute" aria-label="Mute">' +
        '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M7 2.5 3.8 5.2H1.5v5.6h2.3L7 13.5z" fill="currentColor"/>' +
        '<path class="rplay-wave" d="M9.6 5.4a3.6 3.6 0 0 1 0 5.2M11.6 3.6a6.2 6.2 0 0 1 0 8.8" ' +
        'stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>' +
      '</button>' +
      '<input class="rplay-volrange" type="range" min="0" max="100" step="1" aria-label="Volume">' +
      '<button class="rplay-close" aria-label="Close player">&times;</button>';

    // live inside the header grid so it tracks the nav pill's width and hide-on-scroll
    var header = document.getElementById('siteHeader') || document.querySelector('.site-header');
    if (header) header.appendChild(ui);
    else document.body.appendChild(ui);

    els.toggle = ui.querySelector('.rplay-toggle');
    els.time = ui.querySelector('.rplay-time');
    els.seek = ui.querySelector('.rplay-seek');
    els.vol = ui.querySelector('.rplay-volrange');
    els.mute = ui.querySelector('.rplay-mute');

    els.vol.value = Math.round(readVol() * 100);
    paintVol();

    els.toggle.addEventListener('click', function () { api.toggle(); });

    els.seek.addEventListener('input', function () {
      scrubbing = true;
      if (audio && isFinite(audio.duration)) {
        els.time.textContent = fmt(els.seek.value / 1000 * audio.duration);
      }
      paintSeek();
    });
    els.seek.addEventListener('change', function () {
      if (audio && isFinite(audio.duration)) audio.currentTime = els.seek.value / 1000 * audio.duration;
      scrubbing = false;
    });

    els.vol.addEventListener('input', function () {
      var v = Math.max(0, Math.min(1, els.vol.value / 100));
      write({ vol: v });
      if (audio) audio.volume = v;
      paintVol();
    });

    els.mute.addEventListener('click', function () {
      api.setVol(readVol() > 0 ? 0 : DEFAULT_VOL);
    });

    // closing hides the pill only — the track keeps playing
    ui.querySelector('.rplay-close').addEventListener('click', function () {
      show(false);
    });
  }

  function paint() {
    if (!ui) return;
    var a = audio;
    var dur = a && isFinite(a.duration) ? a.duration : 0;
    var cur = a ? a.currentTime : 0;
    els.time.textContent = fmt(cur);
    if (!scrubbing) els.seek.value = dur ? Math.round(cur / dur * 1000) : 0;
    paintSeek();
    ui.classList.toggle('rplay-playing', !!(a && !a.paused));
    els.toggle.setAttribute('aria-label', a && !a.paused ? 'Pause' : 'Play');
  }

  function paintSeek() { els.seek.style.setProperty('--fill', (els.seek.value / 10) + '%'); }

  function paintVol() {
    var v = els.vol.value;
    els.vol.style.setProperty('--fill', v + '%');
    ui.classList.toggle('rplay-muted', Number(v) === 0);
    els.mute.setAttribute('aria-label', Number(v) === 0 ? 'Unmute' : 'Mute');
  }

  function show(on) {
    if (!ui) build();
    ui.classList.toggle('rplay-open', on !== false);
  }

  /* ---- autoplay, and the gesture fallback for when the browser says no ---- */

  function armGesture() {
    if (armed) return;
    armed = true;
    var fire = function () {
      GESTURES.forEach(function (ev) { document.removeEventListener(ev, fire, true); });
      armed = false;
      if (optedOut()) return;
      var p = audio.play();
      if (p && p.catch) p.catch(function () { /* still no. leave it to the button. */ });
    };
    GESTURES.forEach(function (ev) {
      document.addEventListener(ev, fire, ev === 'scroll' ? { capture: true, passive: true } : true);
    });
  }

  // plays with the pill hidden — the UI is opt-in via the nav button
  function autostart() {
    if (optedOut()) return;
    var a = ensureAudio();
    build();
    var p = a.play();
    if (p && p.catch) p.catch(armGesture);
  }

  /* ---- public api — terminal.js drives the same audio through this ---- */

  var api = {
    open: function () { show(true); },
    play: function () {
      var a = ensureAudio();
      write({ audioOff: false });
      show(true);
      var p = a.play();
      paint();
      return p && p.catch ? p.catch(function () { paint(); }) : null;
    },
    // pausing counts as "not now" — otherwise it restarts on the next page
    pause: function () {
      write({ audioOff: true });
      if (audio) { audio.pause(); paint(); }
    },
    toggle: function () { if (audio && !audio.paused) api.pause(); else api.play(); },
    stop: function () {
      write({ audioOff: true, audioAt: 0 });
      lastSaved = -1;
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
      paint();
    },
    isPlaying: function () { return !!(audio && !audio.paused); },
    getVol: readVol,
    setVol: function (v) {
      v = Math.max(0, Math.min(1, v));
      write({ vol: v });
      if (audio) audio.volume = v;
      if (ui) { els.vol.value = Math.round(v * 100); paintVol(); }
      return v;
    },
    title: TITLE
  };

  window.rpkPlayer = api;

  /* ---- nav trigger, same pattern as the terminal button ---- */

  (function () {
    var themeBtn = document.getElementById('themeToggle');
    if (!themeBtn || document.getElementById('playBtn')) return;
    var b = document.createElement('button');
    b.id = 'playBtn';
    b.className = 'term-btn play-btn';
    b.innerHTML = '<svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">' +
      '<path d="M5 3.4 12 8l-7 4.6z" fill="currentColor"/></svg>';
    b.setAttribute('aria-label', 'Show audio player');
    b.title = 'Player';
    // visibility only — the track's state is the pill's business, not this button's
    b.addEventListener('click', function () {
      show(!(ui && ui.classList.contains('rplay-open')));
    });
    themeBtn.parentNode.insertBefore(b, themeBtn);
  })();

  // last chance to park the playhead before the document goes away
  window.addEventListener('pagehide', function () { saveAt(true); });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autostart);
  } else {
    autostart();
  }
})();
