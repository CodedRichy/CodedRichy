(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  gsap.registerPlugin(ScrollTrigger);

  const DELAY = 0.5;

  // ——— HERO ENTRANCE (no ScrollTrigger — always plays) ———
  gsap.set('.hero__scroll-indicator', { opacity: 0 });

  const heroTl = gsap.timeline({ delay: DELAY, defaults: { ease: 'power4.out' } });

  heroTl
    .to('.hero__greeting-inner', { y: 0, duration: 0.8 })
    .to('.hero__name-word', { y: 0, duration: 1, stagger: 0.12, ease: 'power4.out' }, '-=0.4')
    .to('.hero__tagline', { opacity: 1, y: 0, duration: 0.8 }, '-=0.4')
    .to('.hero__cta', { opacity: 1, y: 0, duration: 0.7 }, '-=0.4')
    .to('.hero__scroll-indicator', { opacity: 1, duration: 1 }, '-=0.2');

  gsap.from('#nav', { y: -100, opacity: 0, duration: 0.8, delay: DELAY + 0.6, ease: 'power3.out' });

  // ——— TEXT SCRAMBLE ———
  const scrambleChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`01';

  function scrambleText(el) {
    const original = el.dataset.text || el.textContent;
    el.dataset.text = original;
    const len = original.length;
    let iteration = 0;
    const interval = setInterval(() => {
      el.textContent = original.split('').map((char, i) => {
        if (char === ' ') return ' ';
        if (i < iteration) return original[i];
        return scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
      }).join('');
      iteration += 0.7;
      if (iteration >= len) {
        el.textContent = original;
        clearInterval(interval);
      }
    }, 30);
  }

  // ——— SCROLL REVEAL UTILITY ———
  // Uses onEnter + gsap.to so elements never get stuck at opacity:0
  function reveal(targets, fromVars, triggerOpts) {
    const els = gsap.utils.toArray(targets);
    if (!els.length) return;

    els.forEach((el, i) => {
      const vars = typeof fromVars === 'function' ? fromVars(el, i) : { ...fromVars };
      const delay = vars.delay || 0;
      delete vars.delay;

      gsap.set(el, vars);

      ScrollTrigger.create({
        trigger: triggerOpts.trigger || el,
        start: triggerOpts.start || 'top 88%',
        once: true,
        onEnter: () => {
          gsap.to(el, {
            opacity: 1, x: 0, y: 0, scale: 1, rotateX: 0,
            duration: vars.duration || 0.8,
            delay: delay,
            ease: vars.ease || 'power3.out',
            clearProps: 'transform',
            onStart: triggerOpts.onStart,
          });
        }
      });
    });
  }

  // ——— SECTION HEADERS ———
  gsap.utils.toArray('.section__header').forEach(header => {
    const title = header.querySelector('.section__title');
    const line = header.querySelector('.section__line');

    gsap.set(header, { opacity: 0, x: -60 });
    if (line) gsap.set(line, { scaleX: 0, transformOrigin: 'left center' });

    ScrollTrigger.create({
      trigger: header,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.to(header, {
          opacity: 1, x: 0, duration: 0.9, ease: 'power3.out',
          onStart: () => { if (title) scrambleText(title); }
        });
        if (line) {
          gsap.to(line, { scaleX: 1, duration: 1, ease: 'power3.inOut', delay: 0.3 });
        }
      }
    });
  });

  // ——— ABOUT ———
  reveal('.about__lead', { opacity: 0, y: 50, duration: 1 }, { start: 'top 82%' });

  reveal('.about__text p:not(.about__lead)', (el, i) => ({
    opacity: 0, y: 40, duration: 0.8, delay: i * 0.15
  }), { start: 'top 85%' });

  // ——— STAT CARDS ———
  reveal('.stat-card', (el, i) => ({
    opacity: 0, y: 60, scale: 0.85, duration: 0.7, delay: i * 0.1, ease: 'back.out(1.7)'
  }), { start: 'top 90%' });

  // ——— FOCUS CARDS ———
  reveal('.focus__card', (el, i) => ({
    opacity: 0, y: 60, rotateX: 4, duration: 0.8, delay: i * 0.08
  }), { start: 'top 90%' });

  // ——— MARQUEE ———
  reveal('.stack-marquee', { opacity: 0, duration: 1 }, { start: 'top 92%' });

  // ——— BENTO CARDS ———
  reveal('.bento__card', (el, i) => ({
    opacity: 0, y: 60, scale: 0.95, rotateX: 3, duration: 1, delay: i * 0.08
  }), { start: 'top 90%' });

  // ——— OTHER PROJECT CARDS ———
  reveal('.other-card', (el, i) => ({
    opacity: 0, y: 50, duration: 0.6, delay: (i % 3) * 0.1
  }), { start: 'top 92%' });

  // ——— EXPERIENCE ITEMS ———
  reveal('.experience__item', (el, i) => ({
    opacity: 0, x: -60, duration: 0.8, delay: i * 0.12
  }), { start: 'top 88%' });

  // ——— CONTACT ———
  reveal('.contact__content', { opacity: 0, y: 80, scale: 0.95, duration: 1.2 }, { start: 'top 80%' });

  // ——— FOOTER ———
  reveal('footer', { opacity: 0, y: 20, duration: 0.8 }, { start: 'top 95%' });

  // ——— PARALLAX ———
  gsap.to('#nodeGraph', {
    scrollTrigger: {
      trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true
    },
    y: 200, opacity: 0.2, ease: 'none'
  });

  gsap.utils.toArray('.ambient-orb').forEach((orb, i) => {
    gsap.to(orb, {
      scrollTrigger: {
        trigger: orb.parentElement,
        start: 'top bottom', end: 'bottom top', scrub: true
      },
      y: (i % 2 === 0) ? -100 : 100,
      x: (i % 2 === 0) ? 50 : -50,
      ease: 'none'
    });
  });

  gsap.utils.toArray('.section__header').forEach(header => {
    gsap.to(header, {
      scrollTrigger: {
        trigger: header, start: 'top bottom', end: 'bottom top', scrub: true
      },
      y: -30, ease: 'none'
    });
  });

  // Force recalculate after everything is set up
  ScrollTrigger.refresh();
})();
