/* Footer send-off — 2D canvas particles drifting into the floating pill,
   repelled by the cursor. */
(function () {
  'use strict';

  var canvas = document.getElementById('footer-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var section = canvas.parentElement;
  var navEl = section.querySelector('.footer-nav-wrap');
  var W, H, navR;
  var particles = [];
  var COUNT = 48;
  var mouseX = -1, mouseY = -1;
  var REPEL_R = 90, REPEL_F = 7;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  function accentColor() {
    return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#0a6cff';
  }
  var color = accentColor();
  new MutationObserver(function () { color = accentColor(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  function resize() {
    W = section.offsetWidth;
    H = section.offsetHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var r = navEl.getBoundingClientRect();
    var s = section.getBoundingClientRect();
    navR = {
      left: r.left - s.left,
      right: r.right - s.left,
      top: r.top - s.top,
      bottom: r.bottom - s.top
    };
  }
  resize();
  window.addEventListener('resize', resize);

  section.addEventListener('mousemove', function (e) {
    var r = section.getBoundingClientRect();
    mouseX = e.clientX - r.left;
    mouseY = e.clientY - r.top;
  });
  section.addEventListener('mouseleave', function () { mouseX = -1; mouseY = -1; });

  function spawn() {
    // start at a random edge, aim somewhere on the pill
    var edge = Math.floor(Math.random() * 3); // top, left, right
    var x, y;
    if (edge === 0) { x = Math.random() * W; y = -6; }
    else if (edge === 1) { x = -6; y = Math.random() * H * 0.7; }
    else { x = W + 6; y = Math.random() * H * 0.7; }
    var tx = navR.left + Math.random() * (navR.right - navR.left);
    var ty = navR.top + Math.random() * (navR.bottom - navR.top);
    var dx = tx - x, dy = ty - y;
    var dist = Math.sqrt(dx * dx + dy * dy) || 1;
    var speed = 0.6 + Math.random() * 0.9;
    return {
      x: x, y: y,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      r: 1.2 + Math.random() * 1.8,
      life: 0,
      maxLife: 340 + Math.random() * 240
    };
  }

  for (var i = 0; i < COUNT; i++) {
    var p = spawn();
    p.life = Math.random() * p.maxLife;
    p.x += p.vx * p.life * 0.6;
    p.y += p.vy * p.life * 0.6;
    particles.push(p);
  }

  var running = true;
  var io = new IntersectionObserver(function (entries) {
    running = entries[0].isIntersecting;
    if (running) requestAnimationFrame(tick);
  });
  io.observe(section);

  function tick() {
    if (!running) return;
    requestAnimationFrame(tick);
    ctx.clearRect(0, 0, W, H);

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.life++;

      if (mouseX >= 0) {
        var dx = p.x - mouseX, dy = p.y - mouseY;
        var d2 = dx * dx + dy * dy;
        if (d2 < REPEL_R * REPEL_R && d2 > 0.01) {
          var d = Math.sqrt(d2);
          var f = (1 - d / REPEL_R) * REPEL_F * 0.06;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
      }

      // gentle pull back toward the pill keeps repelled particles on course
      var tx = (navR.left + navR.right) / 2;
      var ty = (navR.top + navR.bottom) / 2;
      p.vx += (tx - p.x) * 0.00004;
      p.vy += (ty - p.y) * 0.00004;
      p.vx *= 0.995;
      p.vy *= 0.995;
      p.x += p.vx;
      p.y += p.vy;

      // absorbed by the pill or expired → respawn
      var inPill = p.x > navR.left && p.x < navR.right && p.y > navR.top && p.y < navR.bottom;
      if (inPill || p.life > p.maxLife || p.x < -20 || p.x > W + 20 || p.y > H + 20) {
        particles[i] = spawn();
        continue;
      }

      var fade = Math.min(1, p.life / 40) * Math.min(1, (p.maxLife - p.life) / 60);
      ctx.globalAlpha = 0.5 * fade;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  requestAnimationFrame(tick);
})();
