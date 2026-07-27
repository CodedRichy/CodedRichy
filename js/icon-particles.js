/* Icon particle morph hero — particles trace icon strokes, flow along them,
   and spring-morph between icons. Technique: one DataTexture row per SVG
   sub-path; the vertex shader samples the row at a per-particle phase. */
(function () {
  'use strict';

  var canvas = document.getElementById('hero-canvas');
  if (!canvas || !window.THREE) { showFallback(); return; }

  var container = canvas.parentElement;
  var W = container.offsetWidth || window.innerWidth;
  var H = container.offsetHeight || window.innerHeight;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: true });
  } catch (e) {
    showFallback();
    return;
  }

  function showFallback() {
    var fb = document.getElementById('heroFallback');
    if (fb) fb.style.display = 'flex';
    if (canvas) canvas.style.display = 'none';
  }

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = window.innerWidth <= 768;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(75, W / H, 0.1, 100);
  var camZ = isMobile ? 4 / (0.75 * 0.75) : 4;
  camera.position.set(0, 0, camZ);
  camera.lookAt(0, 0, 0);
  // pulled-back mobile camera makes fixed-px points read larger — scale down to match
  var ptScale = isMobile ? 0.5625 : 1.0;

  /* ── Icons: one per flagship project, then the sign-off — 24×24 strokes.
     HCR graph → FixMyPrompt wand → Veridock doc → Corvus branch →
     Food Chain fin → Sentinel shield → RISHI. ── */
  var ICON_DEFS = [
    // HCR — memory as a causal event graph
    [{ tag: 'circle', attrs: { cx: 12, cy: 12, r: 2.5 } },
     { tag: 'circle', attrs: { cx: 5, cy: 5, r: 2 } },
     { tag: 'circle', attrs: { cx: 19, cy: 5, r: 2 } },
     { tag: 'circle', attrs: { cx: 5, cy: 19, r: 2 } },
     { tag: 'circle', attrs: { cx: 19, cy: 19, r: 2 } },
     'M10.2 10.2 6.5 6.5',
     'M13.8 10.2 17.5 6.5',
     'M10.2 13.8 6.5 17.5',
     'M13.8 13.8 17.5 17.5'],
    // FixMyPrompt — the fixing wand
    ['M13.5 10.5 4 20',
     'M16 3v10',
     'M11 8h10',
     { tag: 'circle', attrs: { cx: 6, cy: 6, r: 1 } },
     { tag: 'circle', attrs: { cx: 20, cy: 14, r: 1 } }],
    // Veridock — verified document
    ['M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z',
     'M14 2v6h6',
     'm9 15 2 2 4-4'],
    // Corvus — agents branching in parallel
    ['M6 3v12',
     { tag: 'circle', attrs: { cx: 18, cy: 6, r: 3 } },
     { tag: 'circle', attrs: { cx: 6, cy: 18, r: 3 } },
     'M18 9a9 9 0 0 1-9 9'],
    // Food Chain — the apex predator circling
    ['M5 17 C6.5 10 9.5 6 12.5 4 C13 10 16 14 19 17 Z',
     'M2 20.5 Q5 19 8 20.5 Q11 22 14 20.5 Q17 19 22 20.5'],
    // Sentinel — shield-check
    ['M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
     'm9 12 2 2 4-4'],
    // the sign-off — hand-traced letterforms, one row per letter
    ['M3 16 L3 8 L4.6 8 Q6 8 6 10 Q6 12 4.6 12 L3 12 M4.6 12 L6 16',
     'M7.4 8 L9.4 8 M8.4 8 L8.4 16 M7.4 16 L9.4 16',
     'M13.5 9 Q13.5 8 12.2 8 Q10.9 8 10.9 9.7 Q10.9 11.1 12.2 12 Q13.5 12.9 13.5 14.3 Q13.5 16 12.2 16 Q10.9 16 10.9 15',
     'M15.5 8 L15.5 16 M19 8 L19 16 M15.5 12 L19 12',
     'M20.4 8 L22.4 8 M21.4 8 L21.4 16 M20.4 16 L22.4 16']
  ];
  var ICON_COUNT = ICON_DEFS.length;
  var TEX_W = 1024;
  var NS = 'http://www.w3.org/2000/svg';

  function sampleOneDef(def) {
    var svg = document.createElementNS(NS, 'svg');
    svg.style.cssText = 'position:absolute;left:-9999px;width:240px;height:240px';
    svg.setAttribute('viewBox', '0 0 24 24');
    document.body.appendChild(svg);
    var el;
    if (typeof def === 'string') {
      el = document.createElementNS(NS, 'path');
      el.setAttribute('d', def);
    } else {
      el = document.createElementNS(NS, def.tag);
      for (var k in def.attrs) el.setAttribute(k, String(def.attrs[k]));
    }
    svg.appendChild(el);
    var len = Math.max(el.getTotalLength ? el.getTotalLength() : 0, 0.5);
    var n = Math.max(32, Math.round(len * 5));
    var pts = [];
    for (var i = 0; i < n; i++) {
      var p = el.getPointAtLength((i / Math.max(n - 1, 1)) * len);
      pts.push([(p.x - 12) / 6, -(p.y - 12) / 6]);
    }
    document.body.removeChild(svg);
    return { pts: pts, len: len };
  }

  // one texture row per sub-path — particles never cross stroke boundaries
  var texRows = [];
  var iconRowRanges = [];
  ICON_DEFS.forEach(function (defs) {
    var start = texRows.length;
    defs.forEach(function (def) {
      texRows.push(sampleOneDef(def));
    });
    iconRowRanges.push([start, texRows.length]);
  });
  var TOTAL_ROWS = texRows.length;

  // normalize flow speed: short strokes would spin — cap at 4×
  var subPathRates = new Float32Array(TOTAL_ROWS);
  iconRowRanges.forEach(function (range) {
    var maxLen = 0;
    for (var r = range[0]; r < range[1]; r++) maxLen = Math.max(maxLen, texRows[r].len);
    for (r = range[0]; r < range[1]; r++)
      subPathRates[r] = Math.min(maxLen / texRows[r].len, 4.0);
  });

  var texData = new Float32Array(TEX_W * TOTAL_ROWS * 4);
  texRows.forEach(function (row, ri) {
    for (var j = 0; j < TEX_W; j++) {
      var p = row.pts[Math.floor((j / TEX_W) * row.pts.length)];
      var b = (ri * TEX_W + j) * 4;
      texData[b] = p[0];
      texData[b + 1] = p[1];
      texData[b + 2] = 0;
      texData[b + 3] = 1;
    }
  });
  var iconTex = new THREE.DataTexture(texData, TEX_W, TOTAL_ROWS, THREE.RGBAFormat, THREE.FloatType);
  iconTex.wrapS = iconTex.wrapT = THREE.RepeatWrapping;
  iconTex.magFilter = iconTex.minFilter = THREE.NearestFilter;
  iconTex.needsUpdate = true;

  /* ── Particle attributes ── */
  var N = isMobile ? 25000 : 41600;
  var aRnd = new Float32Array(N * 3);
  var aIconPhase = new Float32Array(N);
  var aSubPathRow = new Float32Array(N);
  var aSubPathRowPrev = new Float32Array(N);

  for (var i = 0; i < N; i++) {
    aRnd[i * 3] = (Math.random() - 0.5) * 0.4;
    aRnd[i * 3 + 1] = (Math.random() - 0.5) * 0.4;
    aRnd[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    aIconPhase[i] = Math.random();
  }

  var subPathRowAttr = new THREE.BufferAttribute(aSubPathRow, 1);
  subPathRowAttr.setUsage(THREE.DynamicDrawUsage);
  var prevRowAttr = new THREE.BufferAttribute(aSubPathRowPrev, 1);
  prevRowAttr.setUsage(THREE.DynamicDrawUsage);

  // per-particle spring displacement (CPU physics)
  var dispX = new Float32Array(N), dispY = new Float32Array(N);
  var velX = new Float32Array(N), velY = new Float32Array(N);
  var aDispBuf = new Float32Array(N * 2);
  var dispAttr = new THREE.BufferAttribute(aDispBuf, 2);
  dispAttr.setUsage(THREE.DynamicDrawUsage);

  var aPhaseRateBuf = new Float32Array(N).fill(1.0);
  var phaseRateAttr = new THREE.BufferAttribute(aPhaseRateBuf, 1);
  phaseRateAttr.setUsage(THREE.DynamicDrawUsage);
  // frozen copy of the outgoing icon's rate so the prev shape stays continuous mid-morph
  var aPhaseRatePrevBuf = new Float32Array(N).fill(1.0);
  var phaseRatePrevAttr = new THREE.BufferAttribute(aPhaseRatePrevBuf, 1);
  phaseRatePrevAttr.setUsage(THREE.DynamicDrawUsage);

  var mouseCosTilt = new Float32Array(N);
  var mouseSinTilt = new Float32Array(N);
  var mouseRandMag = new Float32Array(N);
  for (i = 0; i < N; i++) {
    var tilt = aRnd[i * 3 + 2] * 1.2;
    mouseCosTilt[i] = Math.cos(tilt);
    mouseSinTilt[i] = Math.sin(tilt);
    mouseRandMag[i] = 0.5 + Math.abs(aRnd[i * 3]) * 1.0;
  }
  var DISP_K = 25.0;
  var DISP_D = 9.0;

  /* ── Mouse tracking, world space ── */
  var halfH = Math.tan(75 * 0.5 * Math.PI / 180) * camZ;
  var aspect = W / H;
  var mouseR = 90 * halfH / (H * 0.5);
  var mouseRsq = mouseR * mouseR;
  var mouseX = -9999, mouseY = -9999;
  if (window.matchMedia('(hover: hover)').matches && !reducedMotion) {
    canvas.addEventListener('mousemove', function (e) {
      var r = canvas.getBoundingClientRect();
      var nx = (e.clientX - r.left) / r.width * 2 - 1;
      var ny = 1 - (e.clientY - r.top) / r.height * 2;
      mouseX = nx * halfH * aspect;
      mouseY = ny * halfH;
    });
    canvas.addEventListener('mouseleave', function () { mouseX = -9999; mouseY = -9999; });
  }

  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  geo.setAttribute('aRnd', new THREE.BufferAttribute(aRnd, 3));
  geo.setAttribute('aIconPhase', new THREE.BufferAttribute(aIconPhase, 1));
  geo.setAttribute('aSubPathRow', subPathRowAttr);
  geo.setAttribute('aSubPathRowPrev', prevRowAttr);
  geo.setAttribute('aDisp', dispAttr);
  geo.setAttribute('aPhaseRate', phaseRateAttr);
  geo.setAttribute('aPhaseRatePrev', phaseRatePrevAttr);

  var uniforms = {
    uTime: { value: 0 },
    uMorphIcon: { value: 1.0 },
    uAlpha: { value: 0.55 },
    uIconTex: { value: iconTex },
    uTexRows: { value: TOTAL_ROWS * 1.0 },
    uParticleColor: { value: new THREE.Vector3(0.039, 0.424, 1.0) }
  };

  var mat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: [
      'uniform float uTime;',
      'uniform float uMorphIcon;',
      'uniform sampler2D uIconTex;',
      'uniform float uTexRows;',
      'attribute vec3  aRnd;',
      'attribute float aIconPhase;',
      'attribute float aSubPathRow;',
      'attribute float aSubPathRowPrev;',
      'attribute vec2  aDisp;',
      'attribute float aPhaseRate;',
      'attribute float aPhaseRatePrev;',
      'varying float vRadialAlpha;',
      'void main() {',
      '  float t = uTime;',
      '  float m = uMorphIcon;',
      '  float phase     = fract(aIconPhase + t * 0.18 * aPhaseRate);',
      '  float phasePrev = fract(aIconPhase + t * 0.18 * aPhaseRatePrev);',
      '  vec2 uvCurr = vec2(phase,     (aSubPathRow     + 0.5) / uTexRows);',
      '  vec2 uvPrev = vec2(phasePrev, (aSubPathRowPrev + 0.5) / uTexRows);',
      '  vec2 currXY = texture2D(uIconTex, uvCurr).xy;',
      '  vec2 prevXY = texture2D(uIconTex, uvPrev).xy;',
      '  float sAngle = aRnd.x * 15.708;',
      '  float sR     = sqrt(abs(aRnd.y) * 5.0) * 0.11;',
      '  vec2 scatter = vec2(cos(sAngle), sin(sAngle)) * sR;',
      '  vec3 prevIconPos = vec3(prevXY + scatter, aRnd.z * 0.08);',
      '  vec3 currIconPos = vec3(currXY + scatter, aRnd.z * 0.08);',
      '  float mc = clamp(m, 0.0, 1.0);',
      '  float chaos = 4.0 * mc * (1.0 - mc);',
      '  float cx = sin(aRnd.x * 11.3 + t * 2.1) * cos(aRnd.y *  7.9 + t * 1.6);',
      '  float cy = cos(aRnd.z *  9.2 + t * 1.4) * sin(aRnd.x *  5.3 + t * 2.5);',
      '  float cz = sin(aRnd.y *  6.7 + t * 1.9) * 0.4;',
      '  vec3 turb = vec3(cx, cy, cz) * chaos * 0.35;',
      '  vec3 pos = mix(prevIconPos, currIconPos, m) + turb;',
      '  pos.xy += aDisp;',
      '  float dist   = length(pos.xy);',
      '  vRadialAlpha = 1.0 - smoothstep(2.4, 3.0, dist);',
      '  vec4 mv      = modelViewMatrix * vec4(pos, 1.0);',
      '  gl_Position  = projectionMatrix * mv;',
      '  gl_PointSize = ' + (3.5 * ptScale).toFixed(3) + ';',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform float uAlpha;',
      'uniform vec3 uParticleColor;',
      'varying float vRadialAlpha;',
      'void main() {',
      '  vec2 c = gl_PointCoord - 0.5;',
      '  if (dot(c, c) > 0.25) discard;',
      '  gl_FragColor = vec4(uParticleColor, uAlpha * vRadialAlpha);',
      '}'
    ].join('\n')
  });

  scene.add(new THREE.Points(geo, mat));

  /* ── Fly-in particle pool (CPU-driven) ── */
  var FLY_N = 80;
  var FLY_DUR = 2.8;
  var flyStartData = new Float32Array(FLY_N * 3);
  var flyEndData = new Float32Array(FLY_N * 3);
  var flyTimeData = new Float32Array(FLY_N).fill(-100.0);
  var flyPosData = new Float32Array(FLY_N * 3);
  var flyAlphaData = new Float32Array(FLY_N);

  var flyGeo = new THREE.BufferGeometry();
  var flyPosAttr = new THREE.BufferAttribute(flyPosData, 3);
  var flyAlphaAttr = new THREE.BufferAttribute(flyAlphaData, 1);
  flyPosAttr.setUsage(THREE.DynamicDrawUsage);
  flyAlphaAttr.setUsage(THREE.DynamicDrawUsage);
  flyGeo.setAttribute('position', flyPosAttr);
  flyGeo.setAttribute('aAlpha', flyAlphaAttr);

  var flyMat = new THREE.ShaderMaterial({
    uniforms: { uParticleColor: { value: new THREE.Vector3(0.039, 0.424, 1.0) } },
    transparent: true,
    depthWrite: false,
    vertexShader: [
      'attribute float aAlpha;',
      'varying float   vAlpha;',
      'void main() {',
      '  vAlpha = aAlpha;',
      '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
      '  gl_Position  = projectionMatrix * mv;',
      '  gl_PointSize = ' + (6.4 * ptScale).toFixed(3) + ' * aAlpha;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform vec3 uParticleColor;',
      'varying float vAlpha;',
      'void main() {',
      '  if (vAlpha < 0.01) discard;',
      '  vec2 c = gl_PointCoord - 0.5;',
      '  if (dot(c, c) > 0.25) discard;',
      '  gl_FragColor = vec4(uParticleColor, 0.8 * vAlpha);',
      '}'
    ].join('\n')
  });
  var flyMesh = new THREE.Points(flyGeo, flyMat);
  flyMesh.frustumCulled = false;
  scene.add(flyMesh);
  var flyNext = 0;

  var flyDispX = new Float32Array(FLY_N), flyDispY = new Float32Array(FLY_N);
  var flyVelX = new Float32Array(FLY_N), flyVelY = new Float32Array(FLY_N);
  var flyCosTilt = new Float32Array(FLY_N), flySinTilt = new Float32Array(FLY_N);
  var flyRandMag = new Float32Array(FLY_N);
  for (var fi = 0; fi < FLY_N; fi++) {
    var ft = (Math.random() - 0.5) * 1.2;
    flyCosTilt[fi] = Math.cos(ft);
    flySinTilt[fi] = Math.sin(ft);
    flyRandMag[fi] = 0.5 + Math.random() * 1.0;
  }

  // outer sub-path per icon (fly-in targets): graph center, wand line, doc
  // outline, branch arc, fin outline, shield outline, the R
  var OUTER_PATH = [0, 0, 0, 3, 0, 0, 0];

  /* ── Row assignment per icon, cached ── */
  var iconAssignCache = [];
  function computeAssignment(idx) {
    var range = iconRowRanges[idx];
    var start = range[0], end = range[1];
    var count = end - start;
    var lens = [];
    var total = 0;
    for (var r = start; r < end; r++) { lens.push(texRows[r].len); total += texRows[r].len; }
    var minPer = 300;
    var alloc = lens.map(function (l) {
      return Math.round(minPer + (l / total) * (N - minPer * count));
    });
    var sum = alloc.reduce(function (s, a) { return s + a; }, 0);
    alloc[0] += N - sum;

    var rows = new Float32Array(N);
    var w = 0;
    for (var j = 0; j < count; j++)
      for (var k = 0; k < alloc[j]; k++) rows[w++] = start + j;
    for (i = N - 1; i > 0; i--) {
      var jj = Math.floor(Math.random() * (i + 1));
      var tmp = rows[i]; rows[i] = rows[jj]; rows[jj] = tmp;
    }
    var rates = new Float32Array(N);
    for (i = 0; i < N; i++) rates[i] = subPathRates[rows[i]];
    return { rows: rows, rates: rates };
  }

  function assignToIcon(idx) {
    var c = iconAssignCache[idx];
    if (!c) c = iconAssignCache[idx] = computeAssignment(idx);
    aSubPathRow.set(c.rows);
    subPathRowAttr.needsUpdate = true;
    aPhaseRateBuf.set(c.rates);
    phaseRateAttr.needsUpdate = true;
  }

  var morphIcon = 1.0, t2 = 0, flyT = 0;
  var iconIdx = 0, iconPhase = 'showing', iconClock = 0;
  var springX = 1.0, springV = 0.0;
  var SPRING_K = 3.0;
  var SPRING_D = 3.12;

  assignToIcon(0);
  for (var idx = 0; idx < ICON_COUNT; idx++)
    if (!iconAssignCache[idx]) iconAssignCache[idx] = computeAssignment(idx);
  aSubPathRowPrev.set(aSubPathRow);
  aPhaseRatePrevBuf.set(aPhaseRateBuf);

  /* ── Theme-aware color ── */
  var LIGHT_COLOR = new THREE.Vector3(0.671, 0.427, 0.102);
  var DARK_COLOR = new THREE.Vector3(0.890, 0.655, 0.373);
  var targetColor = new THREE.Vector3();
  function setTargetColor() {
    var explicit = document.documentElement.getAttribute('data-theme');
    var dark = explicit
      ? explicit === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    targetColor.copy(dark ? DARK_COLOR : LIGHT_COLOR);
  }
  setTargetColor();
  uniforms.uParticleColor.value.copy(targetColor);
  flyMat.uniforms.uParticleColor.value.copy(targetColor);
  new MutationObserver(setTargetColor).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', setTargetColor);

  /* ── Reduced motion: draw the first icon once, no loop ── */
  if (reducedMotion) {
    uniforms.uTime.value = 0;
    uniforms.uMorphIcon.value = 1.0;
    renderer.render(scene, camera);
    return;
  }

  var lastTs = null;
  var anyActiveDisp = false;

  function animate(ts) {
    requestAnimationFrame(animate);
    var dt = lastTs !== null ? Math.min((ts - lastTs) / 1000, 0.05) : 1 / 60;
    lastTs = ts;

    t2 += dt * 0.24;
    flyT += dt;
    iconClock += dt;

    // icon cycle: hold, then spring to the next — the name holds longer
    if (iconPhase === 'showing' && iconClock > (iconIdx === ICON_COUNT - 1 ? 3.0 : 1.6)) {
      aSubPathRowPrev.set(aSubPathRow);
      prevRowAttr.needsUpdate = true;
      aPhaseRatePrevBuf.set(aPhaseRateBuf);
      phaseRatePrevAttr.needsUpdate = true;
      iconIdx = (iconIdx + 1) % ICON_COUNT;
      assignToIcon(iconIdx);
      springX = 0.0;
      springV = 0.0;
      morphIcon = 0.0;
      iconPhase = 'morphing';
      iconClock = 0;
    }

    if (iconPhase === 'morphing') {
      var Fs = -SPRING_K * (springX - 1.0);
      var Fd = -SPRING_D * springV;
      springV += (Fs + Fd) * dt;
      springX += springV * dt;
      morphIcon = springX;
      if (Math.abs(springX - 1.0) < 0.001 && Math.abs(springV) < 0.001) {
        springX = 1.0; springV = 0.0; morphIcon = 1.0;
        iconPhase = 'showing'; iconClock = 0;
      }
    }

    // per-particle mouse spring physics — skipped entirely when idle
    var mwx = mouseX, mwy = mouseY;
    var mouseActive = mwx > -100;
    if (mouseActive || anyActiveDisp) {
      var phaseTime = t2 * 0.18;
      var nextActive = false;
      for (var i = 0; i < N; i++) {
        if (mouseActive) {
          var phaseC = ((aIconPhase[i] + phaseTime * aPhaseRateBuf[i]) % 1 + 1) % 1;
          var phaseP = ((aIconPhase[i] + phaseTime * aPhaseRatePrevBuf[i]) % 1 + 1) % 1;
          var bCurr = ((aSubPathRow[i] | 0) * TEX_W + ((phaseC * TEX_W) | 0)) * 4;
          var bPrev = ((aSubPathRowPrev[i] | 0) * TEX_W + ((phaseP * TEX_W) | 0)) * 4;
          var m = morphIcon;
          var px = texData[bCurr] * m + texData[bPrev] * (1 - m) + dispX[i];
          var py = texData[bCurr + 1] * m + texData[bPrev + 1] * (1 - m) + dispY[i];
          var ddx = px - mwx, ddy = py - mwy;
          var d2 = ddx * ddx + ddy * ddy;
          if (d2 < mouseRsq && d2 > 1e-6) {
            var d = Math.sqrt(d2);
            var push = (1.0 - d / mouseR) * 9.0;
            var invD = 1.0 / d;
            var nx = ddx * invD, ny = ddy * invD;
            velX[i] += (nx * mouseCosTilt[i] - ny * mouseSinTilt[i]) * push * mouseRandMag[i];
            velY[i] += (nx * mouseSinTilt[i] + ny * mouseCosTilt[i]) * push * mouseRandMag[i];
          }
        }
        var ax = -DISP_K * dispX[i] - DISP_D * velX[i];
        var ay = -DISP_K * dispY[i] - DISP_D * velY[i];
        velX[i] += ax * dt; velY[i] += ay * dt;
        dispX[i] += velX[i] * dt; dispY[i] += velY[i] * dt;
        if (Math.abs(dispX[i]) < 1e-4 && Math.abs(velX[i]) < 1e-4) { dispX[i] = 0; velX[i] = 0; }
        if (Math.abs(dispY[i]) < 1e-4 && Math.abs(velY[i]) < 1e-4) { dispY[i] = 0; velY[i] = 0; }
        aDispBuf[i * 2] = dispX[i];
        aDispBuf[i * 2 + 1] = dispY[i];
        if (dispX[i] !== 0 || velX[i] !== 0 || dispY[i] !== 0 || velY[i] !== 0) nextActive = true;
      }
      anyActiveDisp = nextActive;
      dispAttr.needsUpdate = true;
    }

    uniforms.uTime.value = t2;
    uniforms.uMorphIcon.value = morphIcon;

    // fly-in positions on CPU
    for (var f = 0; f < FLY_N; f++) {
      var st = flyTimeData[f];
      if (st < -99) { flyAlphaData[f] = 0; continue; }
      var tsl = flyT - st;
      if (tsl <= 0 || tsl >= FLY_DUR) { flyAlphaData[f] = 0; continue; }
      var p = tsl / FLY_DUR;
      var bx = flyStartData[f * 3] + p * (flyEndData[f * 3] - flyStartData[f * 3]);
      var by = flyStartData[f * 3 + 1] + p * (flyEndData[f * 3 + 1] - flyStartData[f * 3 + 1]);
      if (mouseActive) {
        var fpx = bx + flyDispX[f], fpy = by + flyDispY[f];
        var fdx = fpx - mwx, fdy = fpy - mwy;
        var fd2 = fdx * fdx + fdy * fdy;
        if (fd2 < mouseRsq && fd2 > 1e-6) {
          var fd = Math.sqrt(fd2);
          var fpush = (1.0 - fd / mouseR) * 9.0;
          var finvD = 1.0 / fd;
          var fnx = fdx * finvD, fny = fdy * finvD;
          flyVelX[f] += (fnx * flyCosTilt[f] - fny * flySinTilt[f]) * fpush * flyRandMag[f];
          flyVelY[f] += (fnx * flySinTilt[f] + fny * flyCosTilt[f]) * fpush * flyRandMag[f];
        }
      }
      var fax = -DISP_K * flyDispX[f] - DISP_D * flyVelX[f];
      var fay = -DISP_K * flyDispY[f] - DISP_D * flyVelY[f];
      flyVelX[f] += fax * dt; flyVelY[f] += fay * dt;
      flyDispX[f] += flyVelX[f] * dt; flyDispY[f] += flyVelY[f] * dt;
      if (Math.abs(flyDispX[f]) < 1e-4 && Math.abs(flyVelX[f]) < 1e-4) { flyDispX[f] = 0; flyVelX[f] = 0; }
      if (Math.abs(flyDispY[f]) < 1e-4 && Math.abs(flyVelY[f]) < 1e-4) { flyDispY[f] = 0; flyVelY[f] = 0; }
      flyPosData[f * 3] = bx + flyDispX[f];
      flyPosData[f * 3 + 1] = by + flyDispY[f];
      flyPosData[f * 3 + 2] = flyStartData[f * 3 + 2] + p * (flyEndData[f * 3 + 2] - flyStartData[f * 3 + 2]);
      flyAlphaData[f] = p < 0.82 ? 1.0 : Math.max(0, 1.0 - (p - 0.82) / 0.18);
    }
    flyPosAttr.needsUpdate = true;
    flyAlphaAttr.needsUpdate = true;

    uniforms.uParticleColor.value.lerp(targetColor, 0.04);
    flyMat.uniforms.uParticleColor.value.lerp(targetColor, 0.04);
    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);

  function randomEdge() {
    var hw = halfH * aspect * 0.92, hh = halfH * 0.92;
    var edge = Math.floor(Math.random() * 4);
    var z = (Math.random() - 0.5) * 0.3;
    if (edge === 0) return [(Math.random() * 2 - 1) * hw, hh, z];
    if (edge === 1) return [hw, (Math.random() * 2 - 1) * hh, z];
    if (edge === 2) return [(Math.random() * 2 - 1) * hw, -hh, z];
    return [-hw, (Math.random() * 2 - 1) * hh, z];
  }

  setInterval(function () {
    if (morphIcon < 0.85) return;
    var slot = flyNext % FLY_N;
    flyNext++;
    var o = randomEdge();
    var sx = o[0], sy = o[1];

    // target the nearest point on the icon's outer stroke so fly-ins never
    // cross through the shape
    var outerRow = iconRowRanges[iconIdx][0] + OUTER_PATH[iconIdx];
    var pts = texRows[outerRow].pts;
    var bestDist = Infinity, bestIdx = 0;
    for (var j = 0; j < pts.length; j++) {
      var dx = pts[j][0] - sx, dy = pts[j][1] - sy;
      var d2 = dx * dx + dy * dy;
      if (d2 < bestDist) { bestDist = d2; bestIdx = j; }
    }
    var tc = Math.floor(bestIdx / pts.length * TEX_W);
    var tb = (outerRow * TEX_W + tc) * 4;

    flyStartData[slot * 3] = sx;
    flyStartData[slot * 3 + 1] = sy;
    flyStartData[slot * 3 + 2] = o[2];
    flyEndData[slot * 3] = texData[tb];
    flyEndData[slot * 3 + 1] = texData[tb + 1];
    flyEndData[slot * 3 + 2] = 0;
    flyTimeData[slot] = flyT;
    flyDispX[slot] = flyDispY[slot] = flyVelX[slot] = flyVelY[slot] = 0;
  }, 75);

  var lastW = W;
  window.addEventListener('resize', function () {
    var W2 = container.offsetWidth || window.innerWidth;
    var H2 = container.offsetHeight || window.innerHeight;
    if (W2 === lastW && window.innerWidth <= 768) return;
    lastW = W2;
    renderer.setSize(W2, H2);
    camera.aspect = W2 / H2;
    camera.updateProjectionMatrix();
  });
})();
