(() => {
  const canvas = document.getElementById('nodeGraph');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width, height, nodes, mouse, animId, running = false;
  const NODE_COUNT = 60;
  const MAX_NODES = 100;
  const CONNECTION_DIST = 180;
  const MOUSE_RADIUS = 250;
  const ACCENT = { r: 139, g: 32, b: 53 };

  mouse = { x: -1000, y: -1000 };

  function resize() {
    width = canvas.width = canvas.offsetWidth;
    height = canvas.height = canvas.offsetHeight;
  }

  function createNodes() {
    nodes = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push(makeNode(Math.random() * width, Math.random() * height));
    }
  }

  function makeNode(x, y, burst) {
    return {
      x, y,
      vx: burst ? (Math.random() - 0.5) * 6 : (Math.random() - 0.5) * 0.4,
      vy: burst ? (Math.random() - 0.5) * 6 : (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 2 + 1,
      baseAlpha: Math.random() * 0.3 + 0.1,
      life: burst ? 1 : null,
    };
  }

  let pulses = [];

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const burstCount = Math.min(12, MAX_NODES - nodes.length);
    for (let i = 0; i < burstCount; i++) {
      nodes.push(makeNode(cx, cy, true));
    }

    pulses.push({ x: cx, y: cy, radius: 0, alpha: 1 });
  });

  function drawNode(n, alpha) {
    const dist = Math.hypot(n.x - mouse.x, n.y - mouse.y);
    const proximity = Math.max(0, 1 - dist / MOUSE_RADIUS);
    const glow = proximity * 0.8;
    const r = n.radius + proximity * 2;
    const lifeAlpha = n.life !== null ? n.life : 1;

    if (glow > 0.05) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, r + 6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${ACCENT.r}, ${ACCENT.g}, ${ACCENT.b}, ${glow * 0.3 * lifeAlpha})`;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    const a = (alpha + glow * 0.5) * lifeAlpha;
    ctx.fillStyle = glow > 0.1
      ? `rgba(${ACCENT.r + 40}, ${ACCENT.g + 20}, ${ACCENT.b + 20}, ${a})`
      : `rgba(200, 200, 200, ${a})`;
    ctx.fill();
  }

  function drawConnection(a, b) {
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    if (dist > CONNECTION_DIST) return;

    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const mouseDist = Math.hypot(midX - mouse.x, midY - mouse.y);
    const mouseProximity = Math.max(0, 1 - mouseDist / MOUSE_RADIUS);

    const lifeA = a.life !== null ? a.life : 1;
    const lifeB = b.life !== null ? b.life : 1;
    const lifeFactor = Math.min(lifeA, lifeB);

    const alpha = ((1 - dist / CONNECTION_DIST) * 0.15 + mouseProximity * 0.25) * lifeFactor;
    if (alpha < 0.01) return;

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);

    if (mouseProximity > 0.1) {
      ctx.strokeStyle = `rgba(${ACCENT.r}, ${ACCENT.g}, ${ACCENT.b}, ${alpha})`;
      ctx.lineWidth = 0.8 + mouseProximity;
    } else {
      ctx.strokeStyle = `rgba(100, 100, 100, ${alpha})`;
      ctx.lineWidth = 0.5;
    }
    ctx.stroke();
  }

  function drawPulses() {
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.radius += 4;
      p.alpha -= 0.015;

      if (p.alpha <= 0) { pulses.splice(i, 1); continue; }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${ACCENT.r}, ${ACCENT.g}, ${ACCENT.b}, ${p.alpha})`;
      ctx.lineWidth = 2 * p.alpha;
      ctx.stroke();

      if (p.radius > 20) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${ACCENT.r + 30}, ${ACCENT.g + 20}, ${ACCENT.b + 20}, ${p.alpha * 0.5})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  function update() {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      n.x += n.vx;
      n.y += n.vy;

      if (n.life !== null) {
        n.life -= 0.008;
        n.vx *= 0.98;
        n.vy *= 0.98;
        if (n.life <= 0) { nodes.splice(i, 1); continue; }
      }

      if (n.x < 0 || n.x > width) n.vx *= -1;
      if (n.y < 0 || n.y > height) n.vy *= -1;

      const dist = Math.hypot(n.x - mouse.x, n.y - mouse.y);
      if (dist < MOUSE_RADIUS) {
        const force = (1 - dist / MOUSE_RADIUS) * 0.02;
        const angle = Math.atan2(n.y - mouse.y, n.x - mouse.x);
        n.vx += Math.cos(angle) * force;
        n.vy += Math.sin(angle) * force;
      }

      const speed = Math.hypot(n.vx, n.vy);
      if (speed > 0.8 && n.life === null) {
        n.vx *= 0.98;
        n.vy *= 0.98;
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        drawConnection(nodes[i], nodes[j]);
      }
    }

    for (const n of nodes) {
      drawNode(n, n.baseAlpha);
    }

    drawPulses();
  }

  function loop() {
    if (!running) return;
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }

  function start() {
    if (running) return;
    running = true;
    loop();
  }

  function stop() {
    running = false;
    cancelAnimationFrame(animId);
  }

  function init() {
    resize();
    createNodes();
    start();
  }

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });

  canvas.addEventListener('mouseleave', () => {
    mouse.x = -1000;
    mouse.y = -1000;
  });

  canvas.addEventListener('touchmove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.touches[0].clientX - rect.left;
    mouse.y = e.touches[0].clientY - rect.top;
  }, { passive: true });

  canvas.addEventListener('touchstart', (e) => {
    const rect = canvas.getBoundingClientRect();
    const cx = e.touches[0].clientX - rect.left;
    const cy = e.touches[0].clientY - rect.top;
    const burstCount = Math.min(8, MAX_NODES - nodes.length);
    for (let i = 0; i < burstCount; i++) {
      nodes.push(makeNode(cx, cy, true));
    }
    pulses.push({ x: cx, y: cy, radius: 0, alpha: 1 });
  }, { passive: true });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      stop();
      resize();
      createNodes();
      start();
    }, 150);
  });

  const canvasObserver = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) { start(); } else { stop(); }
  }, { threshold: 0 });
  canvasObserver.observe(canvas);

  init();
})();
