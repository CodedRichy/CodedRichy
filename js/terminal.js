/* Hidden terminal — press ` anywhere. The AI-engineer's front door.
   No framework, no deps: a queue of output lines and a command map. */
(function () {
  'use strict';

  // path prefix so open/goto works from /projects/ and /writing/ too
  var BASE = /\/(projects|writing)\//.test(location.pathname) ? '../' : '';

  var PROJECTS = [
    ['hcr',         'HCR',          'cognitive runtime — agents that remember'],
    ['fixmyprompt', 'FixMyPrompt',  'production SaaS — prompts, fixed'],
    ['cvb',         'CVB',          'do agents honor what they only remember?'],
    ['torque',      'Torque',       'model router — six runs, one honest kill'],
    ['nulltrace',   'NullTrace',    '18 engines watching layer 2 and 3'],
    ['roadpack',    'RoadPack',     'India-first road safety'],
    ['regulait',    'Regulait',     'EU AI Act checker, shipped in a day'],
    ['sentinel',    'Sentinel',     'piracy detection, 3rd place ACM Nexus'],
    ['corvus',      'Corvus',       'agents building software in parallel'],
    ['food-chain',  'Food Chain',   '68 AI predators vs your startup idea'],
    ['gitpulse',    'GitPulse',     'AI git guardrails'],
    ['litecpu16',   'LiteCPU16',    'a 16-bit CPU in verilog, five instructions']
  ];

  var el = null, outEl = null, inputEl = null, open = false;

  function build() {
    el = document.createElement('div');
    el.className = 'rterm';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Terminal');
    el.innerHTML =
      '<div class="rterm-out" aria-live="polite"></div>' +
      '<div class="rterm-in-row"><span class="rterm-prompt">rishi@portfolio&gt;</span>' +
      '<input class="rterm-in" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Terminal input"></div>';
    document.body.appendChild(el);
    outEl = el.querySelector('.rterm-out');
    inputEl = el.querySelector('.rterm-in');
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var v = inputEl.value.trim();
        inputEl.value = '';
        if (v) run(v);
      } else if (e.key === 'Escape') {
        toggle(false);
      }
      e.stopPropagation();
    });
    print('rishi-portfolio terminal. type `help`.');
  }

  function print(text, cls) {
    var d = document.createElement('div');
    d.className = 'rterm-line' + (cls ? ' ' + cls : '');
    d.textContent = text;
    outEl.appendChild(d);
    outEl.scrollTop = outEl.scrollHeight;
  }

  function echo(cmd) { print('rishi@portfolio> ' + cmd, 'rterm-echo'); }

  function markUsed() {
    try {
      var m = JSON.parse(localStorage.getItem('rpk-memory')) || {};
      if (!m.termUsed) { m.termUsed = true; localStorage.setItem('rpk-memory', JSON.stringify(m)); }
    } catch (e) { /* fine */ }
  }

  // audio lives in player.js — one Audio element, driven from both places
  function player() { return window.rpkPlayer || null; }

  var COMMANDS = {
    help: function () {
      print('commands:');
      print('  ls              list projects');
      print('  open <name>     open a project page');
      print('  whoami          about me');
      print('  writing         the essay');
      print('  gh              github profile');
      print('  resume          the pdf');
      print('  theme           toggle light/dark');
      print('  forget          wipe what this site remembers');
      print('  clear           clear terminal');
      print('  exit            close (` or esc also works)');
    },
    ls: function () {
      PROJECTS.forEach(function (p) {
        print('  ' + p[0] + Array(14 - p[0].length).join(' ') + p[2]);
      });
      print('open one: `open hcr`');
    },
    open: function (arg) {
      if (!arg) { print('open what? try `ls`.'); return; }
      var q = arg.toLowerCase();
      var hit = null;
      PROJECTS.forEach(function (p) {
        if (p[0] === q || p[1].toLowerCase() === q) hit = p;
      });
      if (!hit) { print('no project called "' + arg + '". `ls` shows them.'); return; }
      print('opening ' + hit[1] + '...');
      setTimeout(function () { location.href = BASE + 'projects/' + hit[0] + '.html'; }, 350);
    },
    whoami: function () {
      print('Rishi Praseeth Krishnan. AI systems engineer.');
      print('I build agents that remember — cognitive runtimes,');
      print('MCP tooling, and one SaaS that actually shipped.');
      print('Fueled by chai. Deployed at 3am.');
    },
    writing: function () {
      print('opening essay...');
      setTimeout(function () { location.href = BASE + 'writing/agents-forget.html'; }, 350);
    },
    gh: function () { print('opening github...'); window.open('https://github.com/CodedRichy', '_blank', 'noopener'); },
    github: function () { COMMANDS.gh(); },
    resume: function () { print('fetching pdf...'); window.open(BASE + 'assets/Rishi_Praseeth_Krishnan_Resume.pdf', '_blank', 'noopener'); },
    theme: function () {
      var btn = document.getElementById('themeToggle');
      if (btn) { btn.click(); print('theme flipped. preference saved.'); }
      else print('no theme toggle on this page. odd.');
    },
    forget: function () {
      try { localStorage.removeItem('rpk-memory'); localStorage.removeItem('rpk-theme'); } catch (e) { /* nothing */ }
      print('memory wiped. we never met.');
    },
    clear: function () { outEl.innerHTML = ''; },
    exit: function () { toggle(false); },
    // the ones you find by trying
    sudo: function () { print('nice try. this portfolio runs rootless.'); },
    chai: function () { print('brewing... done. productivity +40%.'); },
    play: function () {
      var p = player();
      if (!p) { print('no player on this page.'); return; }
      if (p.isPlaying()) { print('already playing. `stop` kills it.'); return; }
      p.play();
      print('now playing: ' + p.title + '. `stop` to kill it, `vol 40` to turn it down.');
    },
    vol: function (arg) {
      var p = player();
      if (!p) { print('no player on this page.'); return; }
      if (!arg) {
        print('volume: ' + Math.round(p.getVol() * 100) + '%. set it: `vol 40`, or `vol up` / `vol down`.');
        return;
      }
      var cur = p.getVol(), v;
      var q = arg.toLowerCase();
      if (q === 'up') v = cur + 0.1;
      else if (q === 'down') v = cur - 0.1;
      else if (q === 'max') v = 1;
      else if (q === 'mute' || q === 'off') v = 0;
      else {
        v = parseFloat(q);
        if (!isFinite(v)) { print('volume takes a number 0-100. try `vol 70`.'); return; }
        if (v > 1) v = v / 100; // accept both `vol 70` and `vol 0.7`
      }
      v = p.setVol(Math.round(v * 100) / 100);
      print('volume: ' + Math.round(v * 100) + '%.' + (v === 0 ? ' silence it is.' : ''));
    },
    volume: function (arg) { COMMANDS.vol(arg); },
    mute: function () { COMMANDS.vol('mute'); },
    pause: function () {
      var p = player();
      if (!p || !p.isPlaying()) { print('nothing playing.'); return; }
      p.pause();
      print('paused. `play` resumes.');
    },
    stop: function () {
      var p = player();
      if (!p || !p.isPlaying()) { print('nothing playing.'); return; }
      p.stop();
      print('stopped.');
    },
    hello: function () { print('hey. you found the terminal. that says something about you.'); },
    hi: function () { COMMANDS.hello(); },
    pwd: function () { print(location.pathname); },
    whois: function () { COMMANDS.whoami(); },
    cat: function (arg) {
      if (arg === 'resume' || arg === 'resume.pdf') { COMMANDS.resume(); return; }
      print('cat: ' + (arg || '') + ': is this a filesystem? no. try `ls`.');
    }
  };

  function run(raw) {
    echo(raw);
    if (/^rm\s+-rf\s+\/?/.test(raw)) { print('bold. no.'); return; }
    var parts = raw.split(/\s+/);
    var cmd = parts[0].toLowerCase();
    var fn = COMMANDS[cmd];
    if (fn) fn(parts.slice(1).join(' '));
    else print('command not found: ' + cmd + '. try `help`.');
  }

  function toggle(force) {
    if (!el) build();
    open = force !== undefined ? force : !open;
    el.classList.toggle('rterm-open', open);
    if (open) { markUsed(); setTimeout(function () { inputEl.focus(); }, 80); }
    else inputEl.blur();
  }

  // visible trigger in the nav pill — not every keyboard has a backtick,
  // and phones have none at all
  (function () {
    var themeBtn = document.getElementById('themeToggle');
    if (!themeBtn || document.getElementById('termBtn')) return;
    var b = document.createElement('button');
    b.id = 'termBtn';
    b.className = 'term-btn';
    b.textContent = '>_';
    b.setAttribute('aria-label', 'Open terminal');
    b.title = 'Terminal (`)';
    b.addEventListener('click', function () { toggle(); });
    themeBtn.parentNode.insertBefore(b, themeBtn);
  })();

  document.addEventListener('keydown', function (e) {
    if (e.key !== '`' || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    var tag = t && t.tagName;
    // don't hijack backtick while typing in other inputs; inside the terminal it closes
    if (t && t.classList && t.classList.contains('rterm-in')) {
      e.preventDefault();
      toggle(false);
      return;
    }
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (t && t.isContentEditable)) return;
    e.preventDefault();
    toggle();
  });
})();
