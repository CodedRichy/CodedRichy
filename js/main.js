(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasPointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ——— LOADER ———
  const loader = document.getElementById('loader');
  if (loader) {
    window.addEventListener('load', () => {
      setTimeout(() => loader.classList.add('done'), 400);
    });
  }

  // ——— LENIS SMOOTH SCROLL ———
  let lenis;
  try {
    lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  } catch (e) { /* Lenis unavailable — native scroll fallback */ }
  requestAnimationFrame(() => ScrollTrigger.refresh());

  // ——— SHARED MOUSE STATE ———
  let mx = -100, my = -100;
  document.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
  });

  // ——— CUSTOM CURSOR ———
  const cursor = document.getElementById('cursor');

  if (hasPointer && cursor) {
    const dot = cursor.querySelector('.cursor__dot');
    const ring = cursor.querySelector('.cursor__ring');
    let dx = -100, dy = -100;

    function animateFrame() {
      dx += (mx - dx) * 0.25;
      dy += (my - dy) * 0.25;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${dx}px, ${dy}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(animateFrame);
    }
    animateFrame();

    document.querySelectorAll('a, button, .bento__card, .other-card, .focus__card, .stat-card, .nav__link, .contact__socials a').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });
  }

  // ——— SCROLL PROGRESS ———
  const progressBar = document.getElementById('scrollProgress');
  if (progressBar) {
    window.addEventListener('scroll', () => {
      const scrollTop = document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      progressBar.style.width = (scrollTop / docHeight * 100) + '%';
    }, { passive: true });
  }

  // ——— NAV HIDE/SHOW ———
  let lastScroll = 0;
  const nav = document.getElementById('nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      const current = window.scrollY;
      if (current > 100) {
        nav.classList.toggle('nav--hidden', current > lastScroll && current > 300);
      } else {
        nav.classList.remove('nav--hidden');
      }
      lastScroll = current;
    }, { passive: true });
  }

  // ——— MOBILE MENU ———
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');

  if (menuBtn && mobileMenu) {
    function toggleMenu(open) {
      const isOpen = typeof open === 'boolean' ? open : !mobileMenu.classList.contains('active');
      menuBtn.classList.toggle('active', isOpen);
      mobileMenu.classList.toggle('active', isOpen);
      menuBtn.setAttribute('aria-expanded', isOpen);
      mobileMenu.setAttribute('aria-hidden', !isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    }

    menuBtn.addEventListener('click', () => toggleMenu());

    mobileMenu.querySelectorAll('.mobile-menu__link').forEach(link => {
      link.addEventListener('click', () => toggleMenu(false));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
        toggleMenu(false);
        menuBtn.focus();
      }
    });
  }

  // ——— SMOOTH SCROLL ANCHORS ———
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -80 });
      else target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // ——— ACTIVE NAV LINK ———
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav__link');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.style.color = link.getAttribute('href') === `#${entry.target.id}`
            ? 'var(--text-primary)' : '';
        });
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  sections.forEach(section => observer.observe(section));

  // ——— STAT COUNTER ANIMATION ———
  const counters = document.querySelectorAll('[data-count]');
  counters.forEach(counter => {
    const target = parseInt(counter.dataset.count);
    const suffix = counter.dataset.suffix || '';

    ScrollTrigger.create({
      trigger: counter,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.to({ val: 0 }, {
          val: target,
          duration: target > 100 ? 2 : 1.2,
          ease: 'power2.out',
          onUpdate: function() {
            counter.textContent = Math.round(this.targets()[0].val) + suffix;
          }
        });
      }
    });
  });

  // ——— 3D TILT + SCAN LINE ON BENTO CARDS ———
  document.querySelectorAll('.bento__card').forEach(card => {
    const scanLine = document.createElement('div');
    scanLine.classList.add('bento__scanline');
    card.appendChild(scanLine);

    if (hasPointer && !reducedMotion) {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const tiltX = (y - 0.5) * -5;
        const tiltY = (x - 0.5) * 5;

        card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-4px)`;
        card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
        card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
      });

      card.addEventListener('mouseenter', () => {
        scanLine.classList.add('active');
        setTimeout(() => scanLine.classList.remove('active'), 600);
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    }
  });

  // ——— MAGNETIC BUTTONS ———
  if (hasPointer && !reducedMotion) {
    document.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
      });

      btn.addEventListener('mouseleave', () => {
        gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'power3.out', clearProps: 'transform' });
      });
    });
  }

  // ——— SPOTLIGHT EFFECT ON SECTIONS ———
  if (hasPointer) {
    document.querySelectorAll('.section').forEach(section => {
      const spotlight = document.createElement('div');
      spotlight.classList.add('section__spotlight');
      section.prepend(spotlight);

      section.addEventListener('mousemove', (e) => {
        const rect = section.getBoundingClientRect();
        section.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
        section.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
      });
    });
  }
})();
