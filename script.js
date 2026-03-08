document.addEventListener('DOMContentLoaded', () => {

    // --- Custom Cursor ---
    const cursorDot = document.getElementById('cursor-dot');
    const cursorOutline = document.getElementById('cursor-outline');
    let mouseX = 0;
    let mouseY = 0;
    let outlineX = 0;
    let outlineY = 0;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        // Dot follows instantly
        cursorDot.style.left = `${mouseX}px`;
        cursorDot.style.top = `${mouseY}px`;
    });

    // Smooth animation for outline
    function animateCursor() {
        const easing = 0.15; // lower is slower
        outlineX += (mouseX - outlineX) * easing;
        outlineY += (mouseY - outlineY) * easing;

        cursorOutline.style.left = `${outlineX}px`;
        cursorOutline.style.top = `${outlineY}px`;

        requestAnimationFrame(animateCursor);
    }
    animateCursor();

    // Hover effect on links and buttons
    const interactiveElements = document.querySelectorAll('a, button, .project-card');

    interactiveElements.forEach((el) => {
        el.addEventListener('mouseenter', () => {
            cursorOutline.classList.add('cursor-hover');
            cursorDot.style.backgroundColor = 'transparent';
        });
        el.addEventListener('mouseleave', () => {
            cursorOutline.classList.remove('cursor-hover');
            cursorDot.style.backgroundColor = 'var(--accent)';
        });
    });

    // --- Hide Cursor when it leaves the window ---
    document.addEventListener('mouseleave', () => {
        cursorDot.style.opacity = 0;
        cursorOutline.style.opacity = 0;
    });

    document.addEventListener('mouseenter', () => {
        cursorDot.style.opacity = 1;
        cursorOutline.style.opacity = 1;
    });

    // --- Scroll Reveals ---
    const revealElements = document.querySelectorAll('.reveal-up, .reveal-fade');

    const revealOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const revealOnScroll = new IntersectionObserver(function (entries,
        observer) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            } else {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, revealOptions);

    revealElements.forEach(el => {
        revealOnScroll.observe(el);

        // Stagger project cards delay based on index
        if (el.classList.contains('project-card')) {
            const index = Array.from(el.parentNode.children).indexOf(el);
            el.style.transitionDelay = `${index * 0.1}s`;
        }
    });

    // --- Dynamic Marquee ---
    // Make sure marquee looks infinite by duplicating if needed
    const marquee = document.getElementById('tech-marquee');
    if (marquee) {
        marquee.innerHTML += marquee.innerHTML; // duplicate to ensure smooth scroll
    }

    // --- Staggered Hover Text Logic ---
    const navLinks = document.querySelectorAll('.nav-link, .footer-links a');
    navLinks.forEach(link => {
        const text = link.innerText;
        link.innerText = '';
        link.setAttribute('data-text', text);

        // Wrap each character in a span for original text
        for (let i = 0; i < text.length; i++) {
            const charSpan = document.createElement('span');
            charSpan.classList.add('char');
            // preserve spaces
            charSpan.innerHTML = text[i] === ' ' ? '&nbsp;' : text[i];

            // Stagger original character speeds
            charSpan.style.transitionDelay = `${i * 0.03}s`;

            link.appendChild(charSpan);
        }
    });

    // Generate cloned characters for the 'data-text' pseudo-element effect
    const style = document.createElement('style');
    let delayCSS = '';
    // Let's assume max length of 20 chars for any nav link
    for (let i = 0; i < 20; i++) {
        delayCSS += `.nav-link:hover::before .char:nth-child(${i + 1}) { transition-delay: ${i * 0.03}s } \n`;
        delayCSS += `.cta:hover .char:nth-child(${i + 1}) { transition-delay: ${i * 0.03}s } \n`;
    }
    style.innerHTML = delayCSS;
    document.head.appendChild(style);

    // --- Sublte Parallax on Hero ---
    const heroBg = document.querySelector('.hero-bg-accent');
    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY;
        if (scrolled < window.innerHeight) {
            heroBg.style.transform = `translateY(${scrolled * 0.5}px)`;
        }
    });

    // Trigger initial reveals on load (like hero texts)
    setTimeout(() => {
        document.querySelectorAll('.hero-title, .hero-subtitle, .hero-scroll-indicator, .section-header')
            .forEach(el => el.classList.add('active'));
    }, 100);

});
